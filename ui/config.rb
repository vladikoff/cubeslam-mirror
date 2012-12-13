http_path = "/"
css_dir = "css"
sass_dir = "sass"
images_dir = "images"
javascripts_dir = "js"

if environment == :production
  relative_assets = true
  output_style = :expanded
  line_comments = false
  color_output = false
else
	output_style = :expanded
  relative_assets = true
	line_comments = true
	color_output = true
  asset_cache_buster :none
  sass_options = { :debug_info => true }
end