const util = require('util');
//use console.log(util.inspect(result, false, null)) to get full output (wihout [Object] entries)
const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs-extra'));
const yml = require('js-yaml');
const xml2js = require('xml2js');
const toMarkdown = require('to-markdown');
const parser = new xml2js.Parser();
const moment = require('moment');

//READ FILES
let files = [] //promise array
//config
files.push (new Promise(resolve => {//because promisifyAll and fs.exists is weird
    return fs.exists(__dirname + '/config.yml', resolve);
})
.then(data => {
    if (data) {
        console.log("Loaded Config")
        configure(yml.load(fs.readFileSync(__dirname + '/config.yml', 'utf8')))
    }})
.catch(err => {console.log("Error reading Config" + newline, err)}))

//xml
files.push(fs.readFileAsync(__dirname + '/wordpress.xml')
.then(data => {
    console.log("Loaded XML")
    parser.parseString(data, function (err, result) {
          extract(result)
    });
})
.catch(err => {console.log("Error reading XML" + newline, err)})
)
//async read
Promise.all(files)

//CONFIGURATION
//overwrite default configuration
function configure(data) {
    for (option in data) {
        if (config[option] !== data[option]) {
            console.log("Overriding default option: "+option+": "+config[option]+" with "+data[option])
        }
        config[option] = data[option]
    }
}

//DEFAULTS
let config = {}
//bloginfo options
config.list_terms = true
config.list_terms_nicename = true
//format
config.newline_style ="\r\n"
let newline = config.newline_style
config.line_spacing_amount = 2
let line_spacing = config.newline_style.repeat(config.line_spacing_amount)
config.recognized_embed_style = "[embed]$2[/embed]"
config.embed_style = "[embed]$1[/embed]"
config.iframe_style = "[iframe$1$3 src=\"$2\"][/iframe]" //$2 is src, $1 & $3 are other attributes
config.caption_style = "[caption]$1[/caption]"
config.gallery_image_style = "[figure]$1[/figure]"
config.gallery_style = "[gallery]$1[/gallery]"
config.newlines_in_gallery = true
config.change_underlines = true
config.remove_spans = true
config.remove_weird_spans= true
config.image_folder_path = "/resources/uploads/$1"
//post file options
config.export_w_title_slug = true
//in post header
config.nicename_title_slug = false
config.nicename_tags = false
config.nicename_categories = false
config.taxnms_force_lowercase= true
config.order_taxnms = true
config.merge_taxnms = "tags"
config.get_passwords = false
config.get_post_author = false
config.get_thumbs = true
config.get_thumb_sizes = true
config.get_excerpt = true
config.get_description = true
config.get_original_links = false
//draft status
config.use_published = false
config.use_draft = true
//if neither above used, status: original status

//semi-configurable //see to-markdown if you want to mess about with it further
//other changes handled by regex replacements below
let converterlist = (function() {
    let converters = []
    if (config.change_underlines) {
        let underlinesfilter = {
            filter: 'u', //not supported by most markdown editors
            replacement: function(content) {
                return '__' + content + '__';
            }
        }
        converters.push(underlinesfilter)
    }
    if (config.remove_spans) {
        let spanfilter = {
            filter: 'span',
            replacement: function(content) {
                return content
            }
        }
        converters.push(spanfilter)
    }
    let morefix = {
        filter: 'more',
        replacement: function(content) {
            return newline+'<!--more-->'+newline;
        }
    }
    converters.push(morefix)
    return converters
})();

function extract (result) {
    console.log("Extracting and Processing")
    results = result.rss.channel[0]
    let blog = {};
    function getimagebyid (id) { //function to get url, caption, and title of images/captions inserted through ids //TODO download images?
        for (index in results.item) {
            let itemid = results.item[index]['wp:post_id'][0]
            let item = []
            if (itemid == id){
                item.caption = results.item[index]['excerpt:encoded'][0]
                if (item.caption.length !== 0) {
                    item.caption = toMarkdown(item.caption, {converters: converterlist})
                }
                item.url = results.item[index]['wp:attachment_url'][0]
                item.title = results.item[index]['title'][0]
                if (config.get_thumb_sizes) {
                    item.name = item.url.replace(/http:.*?wp-content\/uploads\/(.*?).jpg/ig, "$1")
                    let sizes = results.item[index]['wp:postmeta'][1]['wp:meta_value'][0]
                    let regexp = new RegExp(item.name + "-(.*?)\\.", "igm")
                    item.sizes = [];
                    sizes.replace(regexp, function(fullmatch, group){
                        item.sizes.push(group)
                    })
                }
                return item
            }
        }
    }
    //GET BLOG INFO
    blog.info = {}
    blog.info.title = results.title[0]
    blog.info.url = results.link[0]
    blog.info.description = results.description[0]
    if (config.list_terms) {
        blog.info.categories = results['wp:category']
        .map(categories => {
            let categorylist = []
            if (config.list_terms_nicename) {
                categorylist.name = categories['wp:cat_name'][0]
                categorylist.nicename = categories['wp:category_nicename'][0]
            } else {
                categorylist.name = categories['wp:cat_name'][0]
            }
            if (typeof categorylist.parent !== "undefined") { //UNTESTED
                categorylist.parent = category['wp:category_parent'][0]
            }
            if (config.taxnms_force_lowercase) {
                categorylist.nicename = categorylist.nicename.toLowerCase()
            }
            return categorylist
        })
        blog.info.tags = results['wp:tag']
        .map(tags => {
            let taglist = []
            taglist.name = tags['wp:tag_slug'][0]
            if (config.list_terms_nicename) {
                taglist.nicename = tags['wp:tag_name'][0]
                taglist.nicename = tags['wp:tag_slug'][0]
            } else {
                taglist.name = tags['wp:tag_name'][0]
            }
            if (config.taxnms_force_lowercase) {
                taglist.nicename = taglist.nicename.toLowerCase()
            }
            return taglist
        })
        function blog_info_taxnms_sort(a,b) {
            if (a.name === b.name) {
                return 0
            } else {
                return (a.name < b.name) ? -1 : 1;
            }
        }
        if (!config.merge_taxnms && config.order_taxnms) {
            blog.info.tags = blog.info.tags.sort(blog_info_taxnms_sort)
            blog.info.categories = blog.info.categories.sort(blog_info_taxnms_sort)
        }
        if (config.merge_taxnms) {
            var tags = blog.info.tags.slice()
            var categories = blog.info.categories.slice()
            delete blog.info.tags
            delete blog.info.categories
            blog.info[config.merge_taxnms] = [...new Set([...tags, ...categories])];
            if (config.order_taxnms) {
                blog.info[config.merge_taxnms] = blog.info[config.merge_taxnms].sort(blog_info_taxnms_sort)
            }
        }
    }
    //console.log(results['wp:terms']);
    //terms not exported, they're just a summary of tags, categories, and other variables used by wordpress that I don't think matter much, you can see them by uncommenting the above

    //BLOG POSTS AND PAGES
    //it's easier to just get both and sort them out just before writing because they're so similar
    blog.posts = results.item
    .filter(items => { //exclude anything that's not a post (attachments)
        let type = items['wp:post_type'][0]
        return type !== "nav_menu_item" && type !== "attachment"
    })
    .map((items, index) => {
        let post = []
        //HEADER
        if (config.use_published) {
            if (items['wp:status'][0] == "draft") {
            post.published = false}
        } else if (config.use_draft){
            if (items['wp:status'][0] == "draft") {post.draft = true}
        } else {
            post.status = items['wp:status'][0]
        }
        post.title = items.title[0]
        post.slug = items['wp:post_name'][0]
        if (config.get_original_links) {
            post.original_link = items.link[0]
        }
        if (config.get_post_author) {
            post.author = items['dc:creator'][0]
        }
        if (items['wp:post_date_gmt'][0] !== "Invalid Date") { //not sure how, but 0000-00-00 00:00:00 might be set which returns invalid
            post.date = moment.utc(items['wp:post_date_gmt'][0], "YYYY-MM-DD HH:mm:ss").format()
        }
        post.type = items['wp:post_type'][0]
        if (config.get_passwords && items['wp:post_password'][0] !== "") {//UNTESTED
            post.password = items['wp:post_password'][0]
        }
        if (config.get_description && items.description[0] !== "") {
            post.description = items.description[0]
            post.description = "\"" + toMarkdown(post.description, {converters: converterlist}) + "\""
        }
        if (config.get_excerpt && items['excerpt:encoded'][0] !== "") {
            post.excerpt = items['excerpt:encoded'][0]
            post.excerpt = "\"" + toMarkdown(post.excerpt, {converters: converterlist}) + "\""
        }
        if (config.get_thumbs && typeof items['wp:postmeta'] !== "undefined") {
            for (key in items['wp:postmeta']) {
                if (items['wp:postmeta'][key]['wp:meta_key'] == "_thumbnail_id") {
                    let thumbnail = getimagebyid(items['wp:postmeta'][key]['wp:meta_value'][0])
                    post.thumbnail_url = thumbnail.url.replace(/http:.*?wp-content\/uploads\/(.*)/ig, config.image_folder_path)
                    if (thumbnail.caption !== "" && thumbnail.caption !== "\"\"") {
                        post.thumbnail_caption = thumbnail.caption
                        if (post.thumbnail_caption.includes("\n")) {
                            post.thumbnail_caption = post.thumbnail_caption.replace(/\"([\S\s]*)\"/g, "$1")
                            post.thumbnail_caption = "|\n    " + post.thumbnail_caption.replace(/\n\n/g, "\n    ")
                            //yaml can't contain hard tabs?
                        }
                    }
                    if (config.get_thumb_sizes && typeof thumbnail.sizes !== 'undefined' && thumbnail.sizes !== null) { //special check for empty arrays
                        post.thumbnail_sizes = "[ " + thumbnail.sizes.join("\", \"") + " ]"
                    }
                }
            }
        }
        //TERMS
        if (typeof items.category !== "undefined") {
            post.tags = items.category.filter(function(tags) {return tags['$'].domain == "post_tag" }).map(tags => {
                var value;
                if (config.nicename_tags) {
                    value = tags['$'].nicename
                } else {
                    value = tags._
                }
                if (typeof config.taxnms_force_lowercase) {
                    value = value.toLowerCase()
                }
                return value
            })
            if (!config.merge_taxnms && config.order_taxnms) {
                post.tags = post.tags.sort()
            }
        } else if (config.merge_taxnms) {
            post.tags = []
        }
        if (typeof items.category !== "undefined") {
            post.categories = items.category.filter(function(categories) {return categories['$'].domain == "category" }).map(categories => {
                var value;
                if (config.nicename_categories) {
                    value = categories['$'].nicename
                } else {
                    value = categories._
                }
                if (typeof config.taxnms_force_lowercase) {
                    value = value.toLowerCase()
                }
                return value
            })
            if (!config.merge_taxnms && config.order_taxnms) {
                post.categories = post.categories.sort()
            }
        } else if (config.merge_taxnms) {
            post.categories = []
        }
        if (config.merge_taxnms) {
            var tags = post.tags.slice()
            var categories = post.categories.slice()
            delete post.tags
            delete post.categories
            post[config.merge_taxnms] = [...new Set([...tags, ...categories])];
            if (config.order_taxnms) {
                post[config.merge_taxnms] = post[config.merge_taxnms].sort()
            }
        }
        //CONTENT PROCESSING
        if (items['content:encoded'][0] !== "") {
            post.content = items['content:encoded'][0]
            post.markdown = post.content.replace("<!--more-->", "<more>nothing</more>")//temporarily allow more tag to be detected by toMarkdown
            post.markdown = post.markdown.replace(/(\n|\r|\r\n)(<a href.*?<\/a>)(\n|\r|\r\n)/g, "<p>$2</p>")
            //toMarkdown might collapse lists of links otherwise
            //it also collapses shortcodes, but they're mostly handled when replacing them below
            if (config.remove_weird_spans) {
                post.markdown = post.markdown.replace(/(?:\r|\r\n|\n)+<span.*?data-wfid.*?>([\s\S]*?)<\/span>/gm, "<p>$1</p>")
            }
            post.markdown = post.markdown.replace(/<p style=\"padding-left\: 30px\;\">(.*?)<\/p>/g, "<blockquote>$1</blockquote>")
            post.markdown = "<p>" + post.markdown.replace(/(\r|\n|\r\n)+/g, "</p><p>") + "</p>"
            post.markdown = toMarkdown(post.markdown, {converters: converterlist})
            //format will depend on templates supported by static generator, other iframes left untouched
            .replace(/\[embed\](.*?)\[\/embed\]/g, (match, group)=> {
                if (group.match("youtu(.be|be)")) {
                    var name = config.recognized_embed_style.replace(/embed/g, "youtube")
                    return group.replace(/(.*?(?:v\=|.be\/))(.*)/, newline + name + newline)
                } else if (group.match("imgur")) {
                    var name = config.recognized_embed_style.replace(/embed/g, "imgur")
                    return group.replace(/(https?:\/\/imgur\.com\/.*?\/)(.*?)([#\/].*|$)/gm, newline + name + newline)
                } else if (group.match("instagram")) {
                    var name = config.recognized_embed_style.replace(/embed/g, "instagram")
                    return group.replace(/(http.*?instagram.com\/.*?\/)(.*?)\//g, newline + name + newline)
                } else {
                    return newline + config.embed_style + newline
                }
            })
            //gets captions set through id, caption shortcode replaced later
            .replace(/\[caption.*?(id="attachment_|id=")(.*?)".*?"].*?((.*?)\[\/caption\]|\))/g, function(match, ignoredgroup, id, innerwrong, inner) {
                if (id == "") { //for some reason one of mine was empty?
                    inner = inner.replace(/(!\[.*?\))(.*)/gm, "$1" + newline + "[caption]$2[/caption]")
                    inner = newline + "[figure]"+ newline + inner +"[/caption]"+newline+"[/figure]" + newline
                    return newline + inner + newline
                } else {
                    let item = getimagebyid(id)
                    if (item.caption.length !== 0) {
                        item.caption = item.caption.replace(/\"([\S\s]*)\"/g, "$1")
                        item.caption = toMarkdown(item.caption)
                        var itemreplace = newline + "[figure]"+ newline + "!["+ item.title + "](" + item.url + ")" + newline + "[caption]" + item.caption +"[/caption]"+newline+"[/figure]" + newline
                    } else {
                        var itemreplace =  newline + "[figure]"+ newline + "!["+ item.title + "](" + item.url + ")" + newline+"[/figure]" + newline
                    }
                }
                return itemreplace
            })
            //puts images in new line
            .replace (/(!\[.*?\]\(.*?(\)\s|\)))/g, newline + "$1" + newline)
            //gets images in gallery and places them in special shortcode
            .replace(/\[gallery.*?ids="(.*?)".*?\]/ig, function(match, idsstring) {
                let ids = idsstring.split(",")
                let urls = []
                if (config.newlines_in_gallery) {
                    var newline = config.newline_style
                } else {
                    var newline = ""
                }
                for (i in ids) {
                    let id = ids[i]
                    let item = getimagebyid(id)
                    if (item.caption.length !== 0) {
                        var itemreplace = newline + "!["+ item.title + "](" + item.url + ")" + newline + "[caption]" + item.caption +"[/caption]" + newline
                    } else {
                        var itemreplace = newline + "!["+ item.title + "](" + item.url + ")" + newline
                    }
                    itemreplace = itemreplace.replace(/([\s\S]*)/gm, match => {
                        if (match !== "") {
                            return newline + "[figure]" + match + "[/figure]" + newline
                        } else {
                            return match
                        }
                    })
                    urls.push(itemreplace)
                }
                urls = urls.join("")
                //shortcode is replaced by config below
                urls = newline + "[gallery]" + newline + urls + "[/gallery]" + newline
                return urls
            })
            //change caption style
            .replace (/\[caption\](.*?)\[\/caption\]/igm, config.caption_style)
            //change path for images
            .replace(/http:.*?wp-content\/uploads\/(.*?\))/ig, config.image_folder_path)
            //change iframe style
            .replace (/\<iframe(.*?)src="(.*?)"(.*?)><\/iframe>/g, newline + config.iframe_style + newline)
            //change gallery style
            .replace (/\[figure\]([^]*)\[\/figure\]/igm, config.gallery_image_style)
            //change gallery style
            .replace (/\[gallery\]([^]*)\[\/gallery\]/igm, config.gallery_style)
            //fix newline + whitespace
            .replace (/\n(\s)+/g, "\n")
            //change newline style
            .replace (/((\r\n|\r|\n)+)/g, line_spacing)
            //order of above can matter
        }
        return post
    })
    writeFiles(blog)
    //DEBUGGING
    // {
    //     let inspect = "thumbnail_sizes"
    //     let item = 0
    //     console.log(newline + "+++++++++++++++++++++++" + newline + "+++++++++++++++++++++++" + newline + "+++++++++++++++++++++++" + newline);
    //     console.log(newline + "================================ Inspect x Property of all Processed Posts =============================================" + newline);
    //     for (post in blog.posts) {
    //         console.log(newline + "ITEM " + post +" =====================" + newline, blog.posts[post][inspect]);
    //     }
    //     console.log(newline + "================================ Inspect y Original Post in Full =============================================" + newline);
    //     console.log(util.inspect(results.item[item], false, null))
    //     console.log(newline + "================================ Inspect y Processed Post #"+item+" =============================================" + newline);
    //     console.log(blog.posts[item]);
    //     console.log(newline + "================================ Inspect x Property of y Processed Post #"+item+" =========================================" + newline);
    //     console.log(blog.posts[item][inspect]);
    // }
}
//WRITE FILES
function writeFiles (blog) {
    //ASSURE DIRECTORIES
    fs.removeAsync(__dirname + "/export/")
    .then(data => {
        console.log("Created /export")
    })
    .then(data => {
        return fs.ensureDirAsync(__dirname + "/export/_posts")
    })
    .then(data => {
        console.log("Created /export/_posts")
        exportPosts()
    })
    .catch(err => {console.log(err)})
    //COMPOSE AND WRITE FILES
    function exportPosts () {
        var writeAll = [] //promise array
        //POSTS AND IMAGES
        for (let item in blog.posts) {
            writeAll.push(Promise.resolve(new Promise(function(resolve, reject) {
                let post = blog.posts[item]
                if (config.export_w_title_slug) {
                    var filename = post.slug
                } else {
                    var filename = post.title
                }
                //console.log(blog.posts[item])
                let content = []
                //content.push(post + newline) //will append item number to file for debugging above
                content.push("---" + newline)
                for (property in post) {
                    if (property !== "undefined") {
                        if (property == "slug") {
                            if (config.nicename_title_slug || post[property] !== post.title.replace(/(-|\/)/g, "").replace(/(\'|\"|\(|\)|\[|\]|\?|\+)/g, "").replace(/(\s)+/g, "-").toLowerCase()) {
                                 content.push(property + ": " + post[property] + newline)
                            }
                        } else if (typeof post[property] == "object") {
                            let array = []
                            for (term in post[property]) {
                                if (term < post[property][term].length) { //because I like those perfectly spaced arrays
                                    array.push("\"" + post[property][term] +"\"")
                                } else {
                                    array.push("\"" + post[property][term] +"\"")
                                }
                            }
                            content.push(property + ": " + "[" + array.join(",") + "]" + newline)
                        } else if (property !== "slug" && property !== "content" && property !== "markdown") {
                            content.push(property + ": " + post[property] + newline)
                        } else if (property == "markdown") {
                                content.push("---" + newline + post[property] + newline)
                        }
                    }
                }
                if (typeof post.markdown == "undefined") { //for empty content
                    content.push("---")
                }
                content = content.join("")
                if (post.type == "page") {
                    fs.writeFileAsync(__dirname + "/export/" + filename +".md", content)
                    .then(data => {
                        //console.log("Exported item: " + (parseInt(item) + 1))
                        resolve()
                    }).catch(err => {reject(err)})
                } else {
                    fs.writeFileAsync(__dirname + "/export/_posts/" + filename +".md", content)
                    .then(data => {
                        //console.log("Exported item: " + (parseInt(item) + 1))
                        resolve()
                    }).catch(err => {reject(err)})
                }
            })))
        }
        //BLOG INFO
        writeAll.push(Promise.resolve(new Promise(function(resolve, reject) {
            let content = []
            for (property in blog.info) {
                if (typeof blog.info[property] !== "object") {
                    content.push(property + ": " + blog.info[property] + newline)
                } else if (typeof blog.info[property] == "object") {//tags and categories
                    content.push(property + ": " + newline)
                    for (term in blog.info[property]) {
                        if (config.list_terms_nicename) {
                            content.push("\t" + blog.info[property][term].name + " (" + blog.info[property][term].nicename + ")" + newline)
                        } else {
                            content.push("\t" + blog.info[property][term].name + newline)
                        }
                    }
                }
            }
            content = content.join("")
            fs.writeFileAsync(__dirname + "/export/metadata.yml", content)
            .then(data => {
                console.log("Exported Blog Info")
                resolve()
            }).catch(err => {reject(err)})
        })))
        //async write all
        Promise.all(writeAll)
        .then(posts => {
            console.log("Exported: " + (posts.length - 1) + " out of " + blog.posts.length)
        })
        .catch(err => {console.log(err)})
    }
}
