# wordpress-to-static

wordpress-to-static is an easy to configure wordpress exporter for static site generators. It can get urls for post thumbnails, and id based images, galleries and captions. Output of embed, caption, and gallery shortcodes can also be changed as needed.

I made this specifically to export my wordpress blog to test with metalsmith so it does not have a specific format in mind. I've allowed things I know commonly change depending on the static generator to be easily configured (draft status indicator, shortcodes, etc).

I'm still testing it so there might be some bugs.

If you know some javascript it should be easy enough to modify things further. See [notes](#notes) below.

# Install

### Prequisites

**Node.js**

Download/clone repository.

Open command line:

`npm install`


## Usage

Drop wordpress xml export into folder.

Rename to wordpres.xml

`node .` or `npm start`

# Config

## Bloginfo

    list_terms : true

Get list of terms in blog info file.

    list_terms_nicename : true

Use nicenames (slug).

## Formatting

    newline_style : "\r\n"

For if newlines type not showing correctly in your editor.

    line_spacing : newline + newline

Default is double line spacing.

### Shortcode Styles

    caption_style : "[caption]$1[/caption]"

    embed_style : "[youtube]$1[/youtube]"

    iframe_style : newline + "[iframe$1$3]$2[iframe]" + newline

$2 is iframe src , $1 and $2 are anything in between (width, height, etc).

    gallery_style : "[gallery]$1[/gallery]"

    newlines_in_gallery : true

Newlines between images and captions in galleries, might cause extra p tags to be inserted depending on your static site generator.

    change_underlines : true

Changes &lt;u&gt;underline&lt;/u&gt; to \__underline__. Not supported by most markdown editors, usually converted to bold. Default is true so instances are easy to search for.

    remove_spans : true

I had some weird spans with weird attributes that were pointless so I removed them, might cause problems if you used spans for some something.

## Exporting

    image_folder_path : "/resources/$1"

Change all wp-content/uploads links. Can be absolute or relative.

    export_w_title_slug : true

Use slug as file name.

### Header

    nicename_title_slug : false

Include title slug.

    nicename_tags : true

    nicename_categories : true

Use nicenames (slug) for terms.

    get_passwords : false

Include passwords.

    get_post_author : false

Include author.

    get_thumbs : true

Include thumb url (is modified with above image folder path). Note more static site generators can't make use of this. It's mostly for reference.

    get_thumb_sizes : false

Get an array of thumb sizes available. I wasn't sure how to output this (see why in [notes](#notes)) so I opted for an array ["200x200", "etc"].

    get_excerpt : true

Include excerpt.

    get_description : true

Include description.

    get_original_links : false

Include original link to post.

#### DRAFT STATUS

    use_published : false

Use published: false or don't include.

    use_draft : true

Use draft: true or don't include.

If neither, inserts status: original status.

# Notes

This does not download any images. I did implement this because I could just grab my local uploads folder.

Password extraction and outputting term if term has parent are untested.

You can test new properties by uncommenting the debugging section which will log the specified sections.

I wasn't sure what to do with the different thumbnail sizes. For now thubnail_url outputs the original url and if there are more sizes, those are listed in an array (thubnail_sizes). It might be possible to set an option to pick x size, but I know not all images might have that array[index] available. Due to the way the metadata is presented in the original xml (as a string not an object!), sizes are found with a regex match, so if one image has [small, medium, large] available, but another has [small, large], if an option were made to pick array[2], they would not be the same size. More sophisticated matching would be needed to identify the sizes assigned by wordpress that correspond to each match.

My idea for outputting the thumbnails like I did was that I could probably write a metalsmith plugin to manage them and append the size array and sort what size I wanted then.
