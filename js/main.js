(function() {

  var app = {};

  var API_URL = 'http://www.reddit.com';

  var IMAGES = {
    loading: 'img/loading.gif'
  };

  // UTIL

  var util = {
    id: function(id) {
      return document.getElementById(id);
    },
    htmlDecode: function(input) {
      var e = document.createElement('div');
      e.innerHTML = input;
      return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
    },
    throttle: function(limit, callback) {
      var wait = false;
      return function() {
        if (!wait) {
          callback();
          wait = true;
          setTimeout(function() {
            wait = false;
          }, limit);
        }
      };
    }
  };

  // MODELS

  var Post = function() {};
  Post.list = function(subreddit, after, nsfw) {
    return m.request({
      method: 'GET',
      url: API_URL + '/r/' + subreddit + '.json?limit=' + app.const.REQUEST_NUM + '&after=' + after,
      background: true
    }).then(function(data) {
      return data.data.children.filter(function(post) {
        return (nsfw || !post.data.over_18) && app.state.viewed.indexOf(post.data.name) === -1;
      }).map(function(post) {
        app.state.viewed.push(post.data.name);
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
    controller: function(args) {
      this.loaded = m.prop(false);
    },
    view: function(ctrl, args) {
      return m('.embed-post', [
        ctrl.loaded() ? m('iframe.embed[frameborder=0]', { src: args.url }) : m('button.load-embed', { onclick: ctrl.loaded.bind(null, true) }, 'Load ' + (args.desc || 'Embedded Content'))
      ]);
    }
  };

  pl.Self = {
    view: function(ctrl, args) {
      return m('.self-post', [
        m('.username', args.author + ' says: '),
        m('.content', args.selftext_html ? m.trust(util.htmlDecode(args.selftext_html)) : args.title)
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

  pl.Loading = {
    controller: function(args) {
      if(args.post && args.post.parseAsync) {
        args.post.parseAsync(args.post.data.url).then(function(url) {
          args.post.parseAsync = null;
          args.post.data.url = url;
          m.redraw();
        });
      }
    },
    view: function(ctrl, args) {
      return m('.loading', [
        m('img', { src: IMAGES.loading })
      ]);
    }
  };

  // the base list of attributes to copy
  var baseAttrs = ['name', 'permalink', 'subreddit', 'score', 'num_comments', 'title'];

  // array of post types, how to match, and how to display them
  var postTypes = [
    { type: 'Video', match: /\.webm$/i },
    { type: 'Video', match: /imgur.+\.(gif|gifv)$/i, parse: function(url) {
      return url.replace(/\.[^\.]+$/, '.webm');
    }},
    { type: 'Image', match: /\.(jpg|png|gif)$/i },
    { type: 'Image', match: /imgur\.com\/[a-z0-9]+$/i, parse: function(url) {
      return 'http://i.imgur.com/' + url.match(/([^\/]+)$/)[0] + '.gif';
    }},
    { type: 'Embed', desc: 'Imgur Gallery', match: /imgur\.com\/(a|gallery)\/[a-z0-9]+$/i, parse: function(url) {
      return url.replace(/\/gallery\//, '/a/') + '/embed';
    }},
    { type: 'Video', match: /gfycat\.com\/[a-z0-9]+$/i, strip: true, parseAsync: function(url) {
      return m.request({
        method: 'GET',
        url: 'http://gfycat.com/cajax/get/' + url.match(/gfycat\.com\/([a-z0-9]+)$/i)[1],
        background: true
      }).then(function(data) {
        return data.gfyItem.webmUrl;
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
    var url = post.url.replace(/[\?#].*$/, '');
    var ret = {};
    postTypes.some(function(type) {
      if((typeof type.match === 'function' ? type.match(post) : type.match.test(url))) {
        ret.data = {};
        ret.type = type.type;
        ret.parseAsync = type.parseAsync;
        baseAttrs.concat(type.fields || []).forEach(function(field) {
          ret.data[field] = post[field];
        });
        ret.key = ret.data.name;
        ret.data.desc = type.desc;
        ret.data.url = type.parse ? type.parse(url) : (type.strip ? url : post.url);
        return true;
      }
    });
    return ret;
  };

  var PostItem = {
    view: function(ctrl, args) {
      var post = args.post;
      var comp = pl[post.type];
      return m('.post', [
        m('.title', [
          m('a[target=_blank]', { href: API_URL + post.data.permalink, title: post.data.subreddit }, post.data.title),
        ]),
        m('.info', [
          m('span.score', post.data.score),
          ' points and ',
          m('span.num-comments', post.data.num_comments)
        ]),
        post.parseAsync ? m.component(pl.Loading, { post: post }) : (
          m.component(comp, post.data)
        )
      ]);
    }
  };

  var PostList = {
    view: function(ctrl, args) {
      var posts = args.posts().slice(0, app.state.limit).map(function(post) {
        return m.component(PostItem, { post: post });
      });
      return m('.post-list', (posts.length > 0 ? posts : [
        m('p.message', args.message || 'Nothing here...')
      ]));
    }
  };

  // GLOBAL EVENTS

  window.addEventListener('scroll', util.throttle(100, function(e) {
    if(document.body.clientHeight - (window.innerHeight + document.body.scrollTop) < window.innerHeight) {
      app.state.limit += app.const.LOAD_NUM;
      m.redraw();
    }
  }));

  window.addEventListener('hashchange', function() {
    if(!app.state.changingHash) {
      m.mount(app.mountElem, null);
      m.mount(app.mountElem, app);
    } else {
      app.state.changingHash = false;
    }
  });

  // APP

  app.const = {
    LOAD_NUM: 3,
    ADD_MORE_THRESHOLD: 10,
    REQUEST_NUM: 25
  };

  app.state = {
    limit: 3,
    viewed: [],
    changingHash: false
  };

  app.controller = function() {
    // running list of posts
    this.posts = m.prop([]);
    // the subreddit to load
    this.subreddit = m.prop('');
    // starting point for post loading
    this.after = m.prop('');
    // whether or not to allow nsfw posts
    this.nsfw = m.prop(false);
    // the subreddit currently showing
    this.cur = {
      subreddit: m.prop(''),
      nsfw: m.prop(false)
    };
    // whether we're currently loading
    this.loading = m.prop(false);

    this.noteAfter = function(posts) {
      if(posts.length > 0) this.after(posts[posts.length - 1].data.name);
      return posts;
    }.bind(this);

    this.resetPosts = function() {
      this.posts = m.prop([]);
      this.after('');
      this.cur.nsfw(false);
      this.cur.subreddit('');
      app.state.viewed.length = 0;
      app.state.limit = app.const.LOAD_NUM;
    }.bind(this);

    this.appendPosts = function(posts) {
      this.posts(this.posts().concat(posts));
      return posts;
    }.bind(this);

    this.handleSubmit = function(e) {
      e.preventDefault();
      if(this.somethingChanged()) {
        this.loadPosts();
      }
    }.bind(this);

    this.writeState = function() {
      this.cur.subreddit(this.subreddit());
      this.cur.nsfw(this.nsfw());
      this.setHash('subreddit is ' + this.cur.subreddit() + ' and nsfw is ' + this.cur.nsfw());
    }.bind(this);

    this.readState = function() {
      if(location.hash) {
        var state = {};
        location.hash.slice(1).split(' and ').forEach(function(thing) {
          var pair = thing.split(' is ');
          state[pair[0]] = pair[1];
        });
        if('subreddit' in state) {
          this.subreddit(state.subreddit);
        }
        if('nsfw' in state) {
          this.nsfw(state.nsfw === 'true');
        }
        return true;
      }
      return false;
    }.bind(this);

    this.setHash = function(hash) {
      app.state.changingHash = true;
      location.hash = hash;
    }.bind(this);

    this.somethingChanged = function() {
      return this.subreddit() !== this.cur.subreddit() || this.nsfw() !== this.cur.nsfw();
    }.bind(this);

    this.loadPosts = function() {
      if(this.subreddit()) {
        if(this.somethingChanged()) {
          this.resetPosts();
          this.loading(true);
        }
        this.writeState();
        Post.list(this.subreddit(), this.after(), this.nsfw())
          .then(this.noteAfter)
          .then(this.appendPosts)
          .then(this.loading.bind(null, false))
          .then(m.redraw);
      } else {
        this.setHash('');
        this.resetPosts();
      }
    }.bind(this);

    if(this.readState()) {
      this.loadPosts();
    }

  };

  app.view = function(ctrl, args) {
    if(!ctrl.loading() && ctrl.posts().length > 0 && ctrl.posts().length <= app.state.limit + app.const.ADD_MORE_THRESHOLD) {
      ctrl.loadPosts();
    }
    return [
      m('h1.header', 'Ayy Rmao'),
      m('form.sr-form', { onsubmit: ctrl.handleSubmit }, [
        m('input[type=text][placeholder=subreddit]', { onchange: m.withAttr('value', ctrl.subreddit), value: ctrl.subreddit(), autofocus: !ctrl.subreddit() }),
        m('label', [
          m('input[type=checkbox]', { onclick: m.withAttr('checked', ctrl.nsfw), checked: ctrl.nsfw() }),
          m('span', 'nsfw?')
        ])
      ]),
      ctrl.loading() ? m.component(pl.Loading, {}) : m.component(PostList, { posts: ctrl.posts, message: ctrl.subreddit() ? '' : 'Please enter a subreddit and press enter.'  })
    ];
  };

  app.mountElem = util.id('app');

  m.mount(app.mountElem, app);

}());
