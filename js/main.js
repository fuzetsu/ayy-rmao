(function() {

  var app = {};

  var API_URL = 'http://www.reddit.com';

  // UTIL

  var util = {
    htmlDecode: function(input) {
      var e = document.createElement('div');
      e.innerHTML = input;
      return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
    }
  };

  // MODELS

  var Post = function() {};
  Post.list = function(subreddit, after, nsfw) {
    return m.request({
      method: 'GET',
      url: API_URL + '/r/' + subreddit + '.json?limit=100&after=' + after
    }).then(function(data) {
      return data.data.children.filter(function(post) {
        return (nsfw || !post.data.over_18) && app.state.viewed.indexOf(post.data.name) === -1;
      }).map(function(post) {
        app.state.viewed.push(post.name);
        return detectPostType(post.data);
      });
    });
  };

  // COMPONENTS

  // container for post layouts
  var pl = {};

  pl.Video = {
    controller: function(args) {
      this.play = function(e) {
        e.target.play();
      };
      this.pause = function(e) {
        e.target.pause();
      };
    },
    view: function(ctrl, args) {
      return m('.video-post', [
        m('video.video[loop][preload=metadata]', { onmouseenter: ctrl.play, onmouseleave: ctrl.pause }, [
          m('source[type=video/webm]', { src: args.url })
        ])
      ]);
    }
  };

  pl.Image = {
    view: function(ctrl, args) {
      return m('.image-post', [
        m('img', { src: args.url })
      ]);
    }
  };

  pl.Embed = {
    view: function(ctrl, args) {
      return m('.embed-post', [
        m('iframe.embed[frameborder=0]', { src: args.url })
      ]);
    }
  };

  pl.Self = {
    view: function(ctrl, args) {
      return m('.self-post', [
        m('.username', args.author + ' says: '),
        m('.content', m.trust(util.htmlDecode(args.selftext_html)))
      ]);
    }
  };

  pl.Link = {
    view: function(ctrl, args) {
      return m('.link-post.self-post', [
        m('.username', args.author + ' says: '),
        m('.content', [
          m('.center', [
            m('a[target=_blank]', { href: args.url }, args.url),
            m('br'),
            m('img', { src: args.thumbnail })
          ])
        ])
      ]);
    }
  };

  // the base list of attributes to copy
  var baseAttrs = ['name', 'permalink', 'subreddit', 'score', 'num_comments', 'title'];

  // array of post types, how to match, and how to display them
  var postTypes = [
    { type: 'video', match: /\.webm$/i },
    { type: 'Video', match: /imgur.+\.(gif|gifv)$/i, parse: function(url) {
      return url.replace(/\.[^\.]+$/, '.webm');
    }},
    { type: 'Image', match: /\.(jpg|png|gif)$/i },
    { type: 'Image', match: /imgur\.com\/[a-z0-9]+$/i, parse: function(url) {
      return 'http://i.imgur.com/' + url.match(/([^\/]+)$/)[0] + '.gif';
    }},
    { type: 'Embed', match: /imgur\.com\/(a|gallery)\/[a-z0-9]+$/i, parse: function(url) {
      return url.replace(/\/gallery\//, '/a/') + '/embed';
    }},
    { type: 'Video', match: /gfycat\.com\/[a-z0-9]+$/i, load: function(post) {
      return m.request({
        method: 'GET',
        url: 'http://gfycat.com/cajax/get/' + post.url.match(/gfycat\.com\/([a-z0-9]+)$/i)[1]
      }).then(function(data) {
        post.url = data.gfyItem.webmUrl;
      });
    }},
    { type: 'Self', match: function(post) {
      return post.is_self;
    }, fields: ['author', 'selftext_html'] },
    { type: 'Link', match: function() {
      return true;
    }, fields: ['author', 'thumbnail'] }
  ];

  // iterates through post types looking for a match for the given url
  var detectPostType = function(post) {
    var url = post.url.replace(/[\?#].+$/, '');
    var ret = {};
    postTypes.some(function(type) {
      if((typeof type.match === 'function' ? type.match(post) : type.match.test(url))) {
        ret.data = {};
        ret.type = type.type;
        ret.load = type.load;
        baseAttrs.concat(type.fields || []).forEach(function(field) {
          ret.data[field] = post[field];
        });
        ret.data.url = type.parse ? type.parse(url) : post.url;
        return true;
      }
    });
    return ret;
  };

  var PostItem = {
    controller: function(args) {
      this.post = m.prop(args.post || {});
    },
    view: function(ctrl, args) {
      var post = ctrl.post();
      var comp = pl[post.type];
      if(post.load && !post.loaded) {
        post.loaded = true;
        post.load(post.data);
      }
      return m('.post', [
        m('.title', [
          m('a[target=_blank]', { href: API_URL + post.data.permalink, title: post.data.subreddit }, post.data.title),
        ]),
        m('.info', [
          m('span.score', post.data.score),
          ' points and ',
          m('span.num-comments', post.data.num_comments)
        ]),
        m.component(comp, post.data)
      ]);
    }
  };

  var PostList = {
    controller: function(args) {
      // the posts to load
      this.posts = args.posts;
    },
    view: function(ctrl, args) {
      var posts = ctrl.posts().slice(0, app.state.limit).map(function(post) {
        return m.component(PostItem, { post: post });
      });
      return m('.post-list', (posts.length > 0 ? posts : [
        m('p.message', 'Nothing Here...')
      ]));
    }
  };

  // GLOBAL EVENTS

  window.addEventListener('scroll', function(e) {
    if(document.body.clientHeight - (window.innerHeight + document.body.scrollTop) < window.innerHeight) {
      app.state.limit += 5;
      m.redraw();
    }
  });

  // APP

  app.state = { limit: 5, viewed: [] };

  app.controller = function() {
    // running list of posts
    this.posts = m.prop([]);
    // the subreddit to load
    this.subreddit = m.prop('');
    // starting point for post loading
    this.after = m.prop('');
    // whether or not to allow nsfw posts
    this.nsfw = m.prop(false);

    this.noteAfter = function(posts) {
      if(posts.length > 0) this.after(posts[posts.length - 1].data.name);
      return posts;
    }.bind(this);

    this.loadPosts = function(e) {
      e.preventDefault();
      app.state.viewed.length = 0;
      app.state.limit = 5;
      Post.list(this.subreddit(), '', this.nsfw()).then(this.noteAfter).then(this.posts);
    }.bind(this);
  };

  app.view = function(ctrl, args) {
    return [
      m('h1.header', 'Ayy Rmao'),
      m('form.sr-form', { onsubmit: ctrl.loadPosts }, [
        m('input[type=text][placeholder=subreddit]', { onchange: m.withAttr('value', ctrl.subreddit), value: ctrl.subreddit() }),
        m('label', [
          m('input[type=checkbox]', { onclick: m.withAttr('checked', ctrl.nsfw), checked: ctrl.nsfw() }),
          m('span', 'nsfw?')
        ])
      ]),
      m.component(PostList, { posts: ctrl.posts })
    ];
  };

  m.mount(document.getElementById('app'), app);

}());
