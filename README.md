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

Rename to `wordpress.xml`

`node .` or `npm start`

# Config

Options and their defaults. Program should log out "Changed default option x with x" if you changed any of them.

```YAML
# BLOGINFO
    # Get list of terms in blog info file.
    list_terms : true
    # Use nicenames (slug).
    list_terms_nicename : true
# FORMATTING
    # For if newlines type not showing correctly in your editor.
    newline_style : "\r\n"
    # Default is double line spacing.
    line_spacing_amount : 2
# FORMATING - SHORTCODES
    caption_style : "[caption]$1[/caption]"
    #$2 will be just embed id (supports youtube, instagram, and imgur), $1 is preceding url
    recognized_embed_style : "[embed]$2[/embed]"
    #for unsupported embeds
    embed_style : "[embed]$1[/embed]"
    # $2 is iframe src , $1 and $2 are anything in between (width, height, etc).
    iframe_style : "[iframe$1$3 src=\"$2\"][/iframe]"
    gallery_style : "[gallery]$1[/gallery]"
    # Newlines between images and captions in galleries, might cause extra p tags to be inserted depending on your static site generator.
    newlines_in_gallery : true
    # Changes &lt;u&gt;underline&lt;/u&gt; to \__underline__. Not supported by most markdown editors, usually converted later to bold. Default is true so instaces are easy to search for.
    change_underlines : true
    # Removes any spans. I had some weird spans with weird attributes that were pointless, might cause problems if you used spans for some something.
    remove_spans : true
# EXPORTING
    # Change all wp-content/uploads links. Can be absolute or relative.
    image_folder_path : "/resources/uploads/$1"
    # Use slug as file name.
    export_w_title_slug : true
# EXPORTING - HEADER
    # Always export the slug property. If false a slug property is included only if it's not the same as the title (when "/" are removed, other symbols replaced with dashes, and multiple dashes in a row are replaced with just one). This is as close to wordpress's urls as I could get but most static generators have their own way of converting titles to urls so that might still cause problems.
    nicename_title_slug : false
    # Use nicenames (slug) for terms.
    nicename_tags : false
    nicename_categories : false
    # Include passwords.
    get_passwords : false
    # Include author.
    get_post_author : false
    # Include thumb url (is modified with above image folder path). Note more static site generators can't make use of this. It's mostly for reference.
    get_thumbs : true
    # Get an array of thumb sizes available. I wasn't sure how to output this (see why in notes section of the readme) so I opted for an array ["200x200", "etc"].
    get_thumb_sizes : true
    # Include excerpt.
    get_excerpt : true
    # Include description.
    get_description : true
    # Include original link
    get_original_links : false
# EXPORTING - HEADER - DRAFT STATUS
    # Use published: false or don't include.
    use_published : false
    # Use draft: true or don't include.
    use_draft : true
    # If neither, inserts status: original status.
```

# Notes

This does not download any images. I didn't implement this because I could just grab my local uploads folder.

Password extraction and outputting term if term has parent are untested.

You can test new properties by uncommenting the debugging section which will log the specified sections/properties.

I wasn't sure what to do with the different thumbnail sizes. For now thubnail_url outputs the original url and if there are more sizes, those are listed in an array (thubnail_sizes). It might be possible to set an option to pick x size, but I know not all images might have that array[index] available. Due to the way the metadata is presented in the original xml (as a string not an object!), sizes are found with a regex match, so if one image has [small, medium, large] available, but another has [small, large], if an option were made to pick array[2], they would not be the same size. More sophisticated matching would be needed to identify the sizes assigned by wordpress that correspond to each match.

My idea for outputting the thumbnails like I did was that I can manage them in the blog templates and append the size array and sort what size I wanted then. The only downside is you need to know a logic heavy template language like ejs to do this.
