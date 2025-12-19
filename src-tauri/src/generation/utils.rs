use serde_json::Value;

/// Extracts base64 data and MIME type from a data URL
///
/// # Arguments
/// * `data_url` - A data URL string (e.g., "data:image/png;base64,iVBORw0KG...")
///
/// # Returns
/// * `Ok((mime_type, base64_data))` - MIME type and base64 string without prefix
/// * `Err(String)` - Error message if parsing fails
///
/// # Examples
/// ```
/// let (mime, data) = extract_base64_from_data_url("data:image/png;base64,ABC123")?;
/// assert_eq!(mime, "image/png");
/// assert_eq!(data, "ABC123");
/// ```
pub fn extract_base64_from_data_url(data_url: &str) -> Result<(String, String), String> {
    // Validate it's a data URL
    if !data_url.starts_with("data:") {
        return Err("Invalid data URL: must start with 'data:'".to_string());
    }

    // Split by comma to separate metadata from base64 data
    let parts: Vec<&str> = data_url.splitn(2, ',').collect();
    if parts.len() != 2 {
        return Err("Invalid data URL format: missing comma separator".to_string());
    }

    let metadata = parts[0];
    let base64_data = parts[1];

    // Parse MIME type from metadata (e.g., "data:image/png;base64" -> "image/png")
    let mime_part = metadata.trim_start_matches("data:");

    // Handle optional charset and base64 indicators
    let mime_type = mime_part
        .split(';')
        .next()
        .unwrap_or("image/png")
        .to_string();

    // Validate it's actually base64 encoded
    if !metadata.contains("base64") {
        return Err("Data URL is not base64 encoded".to_string());
    }

    Ok((mime_type, base64_data.to_string()))
}

/// Extracts reference image data from parameters JSON
///
/// # Arguments
/// * `parameters` - JSON parameters object that may contain `reference_image` field
///
/// # Returns
/// * `Some((mime_type, base64_data))` - If reference image exists and is valid
/// * `None` - If no reference image or parsing fails
pub fn extract_reference_image(parameters: &Value) -> Option<(String, String)> {
    // Try to get reference_image from parameters
    let ref_img = parameters.get("reference_image")?;

    // Get the data URL from the reference image object
    let data_url = ref_img.get("data")?.as_str()?;

    // Extract base64 and MIME type
    match extract_base64_from_data_url(data_url) {
        Ok((mime, base64)) => {
            eprintln!(
                "Extracted reference image: MIME={}, size={}KB",
                mime,
                base64.len() / 1024
            );
            Some((mime, base64))
        }
        Err(e) => {
            eprintln!("Failed to extract reference image: {}", e);
            None
        }
    }
}

/// Gets reference image parameters (strength, denoising, etc.)
///
/// # Arguments
/// * `parameters` - JSON parameters object
///
/// # Returns
/// * Tuple of (strength, denoising_strength, resize_mode, controlnet_type, controlnet_strength)
pub fn get_reference_image_params(
    parameters: &Value,
) -> (f32, f32, String, Option<String>, f32) {
    let ref_img = match parameters.get("reference_image") {
        Some(r) => r,
        None => {
            return (
                0.75,
                0.7,
                "crop".to_string(),
                None,
                1.0,
            )
        }
    };

    let strength = ref_img
        .get("strength")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.75) as f32;

    let denoising_strength = ref_img
        .get("denoisingStrength")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.7) as f32;

    let resize_mode = ref_img
        .get("resizeMode")
        .and_then(|v| v.as_str())
        .unwrap_or("crop")
        .to_string();

    let controlnet_type = ref_img
        .get("controlnetType")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let controlnet_strength = ref_img
        .get("controlnetStrength")
        .and_then(|v| v.as_f64())
        .unwrap_or(1.0) as f32;

    (
        strength,
        denoising_strength,
        resize_mode,
        controlnet_type,
        controlnet_strength,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_base64_from_data_url() {
        // Valid PNG data URL
        let result = extract_base64_from_data_url("data:image/png;base64,iVBORw0KGgoAAAANS");
        assert!(result.is_ok());
        let (mime, data) = result.unwrap();
        assert_eq!(mime, "image/png");
        assert_eq!(data, "iVBORw0KGgoAAAANS");

        // Valid JPEG data URL
        let result = extract_base64_from_data_url("data:image/jpeg;base64,/9j/4AAQSkZJRg");
        assert!(result.is_ok());
        let (mime, data) = result.unwrap();
        assert_eq!(mime, "image/jpeg");
        assert_eq!(data, "/9j/4AAQSkZJRg");

        // Invalid: not a data URL
        let result = extract_base64_from_data_url("http://example.com/image.png");
        assert!(result.is_err());

        // Invalid: missing comma
        let result = extract_base64_from_data_url("data:image/png;base64");
        assert!(result.is_err());

        // Invalid: not base64 encoded
        let result = extract_base64_from_data_url("data:text/plain,hello");
        assert!(result.is_err());
    }

    #[test]
    fn test_extract_reference_image() {
        // Valid reference image
        let params = serde_json::json!({
            "reference_image": {
                "data": "data:image/png;base64,ABC123",
                "strength": 0.8
            }
        });
        let result = extract_reference_image(&params);
        assert!(result.is_some());
        let (mime, data) = result.unwrap();
        assert_eq!(mime, "image/png");
        assert_eq!(data, "ABC123");

        // No reference image
        let params = serde_json::json!({
            "other_param": "value"
        });
        let result = extract_reference_image(&params);
        assert!(result.is_none());
    }

    #[test]
    fn test_get_reference_image_params() {
        // Full params
        let params = serde_json::json!({
            "reference_image": {
                "strength": 0.85,
                "denoisingStrength": 0.65,
                "resizeMode": "fill",
                "controlnetType": "canny",
                "controlnetStrength": 0.9
            }
        });
        let (str, den, resize, cn_type, cn_str) = get_reference_image_params(&params);
        assert_eq!(str, 0.85);
        assert_eq!(den, 0.65);
        assert_eq!(resize, "fill");
        assert_eq!(cn_type, Some("canny".to_string()));
        assert_eq!(cn_str, 0.9);

        // Default params
        let params = serde_json::json!({});
        let (str, den, resize, cn_type, cn_str) = get_reference_image_params(&params);
        assert_eq!(str, 0.75);
        assert_eq!(den, 0.7);
        assert_eq!(resize, "crop");
        assert_eq!(cn_type, None);
        assert_eq!(cn_str, 1.0);
    }
}
