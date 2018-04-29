/*global m,location,localStorage */
(function() {

  var app = {};

  var API_URL = 'https://www.reddit.com';

  var IMAGES = {  
    loading: 'img/loading.gif'
  };

  // UTIL

  var util = {
    id: function(id) {
      return document.getElementById(id);
    },
    titleCase: function(str) {
      return str.replace(/([a-z]+)/gi, function(match) {
        return match.charAt(0).toUpperCase() + match.slice(1);
      });
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
    },
    withAttrNoRedraw: function(attr, prop) {
      return m.withAttr(attr, function(value) {
        m.redraw.strategy('none');
        prop(value);
      });
    },
    deferredProp: function(value) {
      var prop = m.deferred();
      prop.resolve(value);
      return prop.promise;
    },
    pluralize: function(word, count) {
      return count !== 1 ? word + 's' : word;
    },
    genColor: function(numOfSteps, step) {
      // This function generates vibrant, "evenly spaced" colours (i.e. no clustering). This is ideal for creating easily distinguishable vibrant markers in Google Maps and other apps.
      // Adam Cole, 2011-Sept-14
      // HSV to RBG adapted from: http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
      var r, g, b;
      var h = step / numOfSteps;
      var i = ~~(h * 6);
      var f = h * 6 - i;
      var q = 1 - f;
      switch (i % 6) {
        case 0:
          r = 1;g = f;b = 0;break;
        case 1:
          r = q;g = 1;b = 0;break;
        case 2:
          r = 0;g = 1;b = f;break;
        case 3:
          r = 0;g = q;b = 1;break;
        case 4:
          r = f;g = 0;b = 1;break;
        case 5:
          r = 1;g = 0;b = q;break;
      }
      var c = "#" + ("00" + (~~(r * 255)).toString(16)).slice(-2) + ("00" + (~~(g * 255)).toString(16)).slice(-2) + ("00" + (~~(b * 255)).toString(16)).slice(-2);
      return (c);
    }
  };

  // common actions
  var ex = {
    toggleExpand: function(type, e) {
      var target = e.target;
      var titled = util.titleCase(type);
      var style = target.style;
      var viewport = window['inner' + titled];
      var orig = (target['natural' + titled] || target['video' + titled] || '');
      var cur = target['client' + titled];
      var dim = style[type];
      if(!dim && (orig === cur || orig * 0.8 <= cur)) {
        dim = orig + '';
      }
      if (dim) {
        if (dim.indexOf(orig) > -1 && orig <= viewport * 0.99) {
          style[type] = (orig * 1.75) + 'px';
          style.maxHeight = 'none';
        } else {
          style[type] = '';
          style.maxHeight = '';
        }
      } else {
        style[type] = orig + 'px';
        style.maxHeight = 'none';
      }
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
  
  var Comments = function() {};
  Comments.list = function(post) {
    return m.request({
      method: 'GET',
      url: API_URL + post.permalink + '.json',
      background: true
    }).then(function(data) {
      return data[1].data.children;
    });
  };

  // COMPONENTS

  // container for post layouts
  var pl = {};

  pl.Video = {
    controller: function(args) {
      var play = function(e) {
        e.target.play();
      };
      var pause = function(e) {
        e.target.pause();
      };
      return {
        toggleExpand: ex.toggleExpand.bind(null, 'height'),
        play: play,
        pause: pause,
      };
    },
    view: function(ctrl, args) {
      var post = args.post;
      return m('.video-post', [
        m('video.video[loop][preload=metadata]', { onmouseenter: ctrl.play, onmouseleave: ctrl.pause, onclick: ctrl.toggleExpand }, [
          m('source[type=video/mp4]', { src: post.url })
        ])
      ]);
    }
  };

  pl.Image = {
    controller: function(args) {
      return {
        toggleExpand: ex.toggleExpand.bind(null, 'width')
      };
    },
    view: function(ctrl, args) {
      var post = args.post;
      return m('.image-post', [
        m('img', { src: post.url, onclick: ctrl.toggleExpand })
      ]);
    }
  };

  pl.Embed = {
    controller: function(args) {
      return {
        loaded: m.prop(false)
      };
    },
    view: function(ctrl, args) {
      var post = args.post;
      var url = post.url;
      if(location.protocol === 'https:') {
        url = url.replace(/^.+:/, location.protocol);
      }
      return m('.embed-post', [
        ctrl.loaded() ? m('iframe.embed[frameborder=0]', { src: url }) : m('button.load-embed', { onclick: ctrl.loaded.bind(null, true) }, 'Load ' + (post.desc || 'Embedded Content'))
      ]);
    }
  };

  pl.Self = {
    view: function(ctrl, args) {
      var post = args.post;
      return m('.self-post', [
        m('.username', post.author + ' says: '),
        m('.content', post.selftext_html ? m.trust(util.htmlDecode(post.selftext_html)) : post.title)
      ]);
    }
  };

  pl.Link = {
    view: function(ctrl, args) {
      var post = args.post;
      return m('.link-post.self-post', [
        m('.username', post.author + ' says: '),
        m('.content', [
          m('.center', [
            m('a[target=_blank]', { href: post.url }, post.url),
            m('br'),
            m('img', { src: post.thumbnail })
          ])
        ])
      ]);
    }
  };

  pl.Loading = {
    controller: function(args) {
      if(args.post && args.post.parseAsync) {
        args.post.parseAsync(args.post.url, args.post).then(function(url) {
          args.post.parseAsync = null;
          args.post.url = url;
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
    { type: 'Video', match: /\.(webm|mp4)$/i },
    { type: 'Video', match: /imgur.+\.(gif|gifv)$/i, parse: function(url) {
      return url.replace(/\.[^\.]+$/, '.mp4');
    }},
    { type: 'Image', match: /reddituploads/i, strip: false, parse: function(url) {
      return url.replace(/&amp;/gi, '&');
    }}, 
    { type: 'Image', match: /\.(jpg|png|gif)$/i},
    { type: 'Image', match: /imgur\.com\/[a-z0-9]+$/i, parse: function(url) {
      return 'http://i.imgur.com/' + url.match(/([^\/]+)$/)[0] + '.gif';
    }},
    { type: 'Embed', desc: 'Imgur Gallery', match: /imgur\.com\/(a|gallery)\/[a-z0-9]+$/i, parse: function(url) {
      return url.replace(/\/gallery\//, '/a/').replace(/^http:/, 'https:') + '/embed?pub=true&analytics=false';
    }},
    { type: 'Video', match: /gfycat\.com\/[a-z0-9]+$/i, strip: true, parseAsync: function(url) {
      return m.request({
        method: 'GET',
        dataType: 'jsonp',
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
    var npost = {};
    postTypes.some(function(type) {
      if((typeof type.match === 'function' ? type.match(post) : type.match.test(url))) {
        baseAttrs.concat(type.fields || []).forEach(function(field) {
          npost[field] = post[field];
        });
        ['type', 'parseAsync', 'desc'].forEach(function(field) {
          npost[field] = type[field];
        });
        npost.url = type.parse ? type.parse(type.strip === false ? post.url : url) : (type.strip ? url : post.url);
        return true;
      }
    });
    return npost;
  };

  var PostItem = {
    view: function(ctrl, args) {
      var post = args.post;
      var comp = pl[post.type];
      return m('.post', [
        m('.title', [
          m('a[target=_blank]', { 
            href: API_URL + post.permalink,
            title: post.subreddit,
            onclick: function(e) {
              if(e.ctrlKey) return;
              e.preventDefault();
              app.state.openPost = post;
            }
          }, m.trust(post.title)),
        ]),
        m('.info', [
          m('span.score', post.score),
          ' points and ',
          m('span.num-comments', post.num_comments),
          ' comments on ',
          m('span.sub-name', [
            m('a', {
              href: `#subreddit is ${post.subreddit} and nsfw is ${app.state.nsfw() ? 'enabled' : 'disabled'}`,
              onclick: e => {
                if(e.button === 0) setTimeout(() => location.reload(), 200);
              }
            }, post.subreddit)
          ])
        ]),
        post.parseAsync ? m(pl.Loading, { post: post }) : (
          m(comp, { post: post })
        )
      ]);
    }
  };

  var PostList = {
    view: function(ctrl, args) {
      var posts = args.posts().slice(0, app.state.limit).map(function(post) {
        return m(PostItem, { post: post });
      });
      return m('.post-list', (posts.length > 0 ? posts : [
        m('p.message', args.message || 'Nothing here...')
      ]));
    }
  };
  
  var Modal = {
    view: function(ctrl, args) {
      return m('div.overlay', {
        onclick: e => {
          if(args.onclose && e.target.classList.contains('overlay')) args.onclose();
        }
      }, m('div.modal', [
        m('div.modal-header', [
          m('div.modal-header-content', args.header),
          m('div.modal-header-actions', [
            m('span.modal-close', {
              onclick: function(e) {
                args.onclose && args.onclose();
              }
            }, m.trust('&times;'))
          ])
        ]),
        m('div.modal-body', args.content)
      ]));
    }
  };
  
  var PostCommentsModal = {
    controller: function(args) {
      let ctrl = {
        post: app.state.openPost,
        onclose: () => app.state.openPost = null,
      };
      return ctrl;
    },
    view: function(ctrl, args) {
      return m(Modal, {
        onclose: ctrl.onclose,
        header: [
          m('a[target=_blank]', { href: API_URL + ctrl.post.permalink }, 'Comments: '),
          m.trust(ctrl.post.title)
        ],
        content: m(PostComments, { post: ctrl.post })
      });
    }
  };
  
  var PostComments = {
    controller: function(args) {
      var comments = m.prop([]);
      var loading = m.prop(true);
      Comments.list(args.post)
        .then(comments)
        .then(loading.bind(null, false))
        .then(m.redraw)
      return {
        loading: loading,
        comments: comments
      };
    },
    view: function(ctrl, args) {
      return m('div.post-comments', [
        ctrl.loading() ? m('div.center', m(pl.Loading, {})) : '',
        m('div.post-comments-list', ctrl.comments().map((c, idx, arr) => {
          if(c.kind === 'more') return m(LoadMoreComments, { parentArray: arr, moreComments: c.data });
          return m(PostComment, {comment: c.data });
        }))
      ]);
    }
  };
  
  var LoadMoreComments = {
    controller(args) {
      return {
        loading: m.prop(false)
      };
    },
    view(ctrl, args) {
      if(ctrl.loading()) return m(pl.Loading, {});
      let mc = args.moreComments;
      return m('a.btn-load-more-comments[href=#]', {
        onclick: e => {
          e.preventDefault();
          ctrl.loading(true);
          m.request({
            method: 'GET',
            url: API_URL + '/api/morechildren.json',
            data: {
              api_type: 'json',
              children: mc.children.join(','),
              link_id: app.state.openPost.name
            }
          }).then(data => {
            ctrl.loading(false);
            console.log(data);
            if(!data || !data.json || !data.json.data || !data.json.data.things || data.json.data.things.length <= 0) {
              console.log('didnt get more comments to load :(', data && data.json && data.json.errors);
              return;
            }
            // remove load more button
            args.parentArray.some((c, idx) => {
              if(c.kind === 'more' && c.data.id === mc.id) {
                args.parentArray.splice(idx, 1);
                return true;
              }
            });
            // add in new comments
            let lastCommentAtDepth = {};
            data.json.data.things.forEach(cmt => {
              if(cmt.data.depth === mc.depth) {
                args.parentArray.push(cmt);
              } else {
                let parentComment = lastCommentAtDepth[cmt.data.depth - 1];
                if(!parentComment) return;
                parentComment.data.replies = parentComment.data.replies || {
                  kind: "Listing",
                  data: {
                    children: []
                  }
                };
                parentComment.data.replies.data.children.push(cmt);
              }
              lastCommentAtDepth[cmt.data.depth] = cmt;
            });
          }, err => console.log(err));
        }
      }, 'Load ', mc.count, ' more ', util.pluralize('comment', mc.count), '.');
    }
  };
  
  var _borderColor = {};
  var PostComment = {
    view: function(ctrl, args) {
      let cmt = args.comment;
      let createdAt = new Date(cmt.created * 1000);
      let editedAt = cmt.edited && new Date(cmt.edited * 1000);
      let borderColor = _borderColor[cmt.depth];
      if(!borderColor) {
        borderColor = util.genColor(12, cmt.depth);
        _borderColor[cmt.depth] = borderColor;
      }
      return m('div.post-comment', {
        style: `border-left-color: ${borderColor};`
      }, [
        m('div.post-comment-info', [
          m('strong.post-comment-collapse', {
            onclick: e => cmt.collapsed = !cmt.collapsed
          }, '[', cmt.collapsed ? '+' : '-', '] '),
          m('span.post-comment-author', cmt.author), ', ',
          m('span.score', cmt.score), ' points, posted: ',
          createdAt.toLocaleString(),
          editedAt ? [', edited: ', editedAt.toLocaleString()] : '', ' ',
          m('a[target=_blank]', { href: API_URL + cmt.permalink }, m.trust('&#x1f517;'))
        ]),
        !cmt.collapsed ? [
          m('div.post-comment-text', m.trust(util.htmlDecode(cmt.body_html))),
          cmt.replies ? m('div.post-comment-replies', cmt.replies.data.children.map((c, idx, arr) => {
            if(c.kind === 'more') return m(LoadMoreComments, { parentArray: arr, moreComments: c.data });
            return m(PostComment, { comment: c.data });
          })) : ''
        ] : ''
      ]);
    }
  };

  // GLOBAL EVENTS

  window.addEventListener('scroll', util.throttle(100, function(e) {
    var scrollTop = Math.max(document.documentElement.scrollTop, document.body.scrollTop);
    if(document.body.clientHeight - (window.innerHeight + scrollTop) < window.innerHeight) {
      app.state.limit += app.const.LOAD_NUM;
      m.redraw();
    }
  }));

  window.addEventListener('hashchange', function() {
    if(!app.state.changingHash) {
      location.reload();
      // m.mount(app.mountElem, null);
      // m.mount(app.mountElem, app);
    } else {
      app.state.changingHash = false;
    }
  });

  // APP

  app.const = {
    FIRST_LOAD_NUM: 7,
    LOAD_NUM: 3,
    ADD_MORE_THRESHOLD: 10,
    REQUEST_NUM: 25,
    FKEY: 'ayy-rmao-filter',
  };

  app.state = {
    limit: 3,
    viewed: [],
    changingHash: false,
    subreddit: m.prop(''),
    nsfw: m.prop(false),
    filter: m.prop(localStorage[app.const.FKEY] || ''),
  };

  app.controller = function() {
    // the subreddit to load
    var subreddit = app.state.subreddit;
    // subreddits to filter out from results
    var filter = app.state.filter;
    // whether or not to allow nsfw posts
    var nsfw = app.state.nsfw;
    // running list of posts
    var posts = m.prop([]);
    // starting point for post loading
    var after = m.prop('');
    // whether loading failed
    var failed = m.prop(false);
    // the subreddit currently showing
    var cur = {
      subreddit: m.prop(''),
      nsfw: m.prop(false),
      filter: m.prop(filter())
    };
    // whether we're currently loading
    var loading = m.prop(false);

    // -- START PRIVATE
    var noteAfter = function(newPosts) {
      if(newPosts.length > 0) after(newPosts[newPosts.length - 1].name);
      return newPosts;
    };

    var resetPosts = function() {
      posts([]);
      after('');
      cur.nsfw(false);
      cur.subreddit('');
      cur.filter(localStorage[app.const.FKEY] || '');
      app.state.viewed.length = 0;
      app.state.limit = app.const.FIRST_LOAD_NUM;
    };

    var appendPosts = function(newPosts) {
      posts(posts().concat(newPosts));
      return newPosts;
    };

    var writeState = function() {
      cur.subreddit(subreddit());
      cur.nsfw(nsfw());
      cur.filter(filter());
      localStorage[app.const.FKEY] = filter();
      setHash('subreddit is ' + cur.subreddit() + (cur.filter() ? ' and filter is ' + cur.filter() : '') + ' and nsfw is ' + (cur.nsfw() ? 'enabled' : 'disabled'));
    };

    var readState = function() {
      var hash = decodeURIComponent(location.hash);
      if(hash) {
        var state = {};
        hash.slice(1).split(' and ').forEach(function(thing) {
          var pair = thing.split(' is ');
          state[pair[0]] = pair[1];
        });
        if('subreddit' in state) {
          subreddit(state.subreddit);
        }
        if('nsfw' in state) {
          nsfw(state.nsfw === 'enabled');
        }
        if('filter' in state) {
          localStorage[app.const.FKEY] = state.filter;
          filter(state.filter);
        }
        return true;
      }
      return false;
    };

    var setHash = function(hash) {
      clearInterval(app.state.timeoutId);
      app.state.changingHash = true;
      location.hash = hash;
      app.state.timeoutId = setTimeout(() => {
        app.state.changingHash = false;
      }, 500);
    };

    var somethingChanged = function() {
      return subreddit() !== cur.subreddit() || nsfw() !== cur.nsfw() || filter() !== cur.filter();
    };

    var handleError = function(e) {
      loading(false);
      failed(true);
      m.redraw();
    };

    var applyFilter = function(posts) {
      if(!filter()) return posts;
      var filtered = filter().split('+');
      return posts.filter(function(post) {
        return filtered.indexOf(post.subreddit) === -1;
      });
    };
    // -- END PRIVATE

    // -- START PUBLIC
    var handleSubmit = function(e) {
      e.preventDefault();
      if(somethingChanged()) {
        loadPosts();
      }
    };

    var loadPosts = function() {
      if(subreddit()) {
        if(somethingChanged()) {
          resetPosts();
          loading(true);
        }
        failed(false);
        writeState();
        Post.list(subreddit(), after(), nsfw())
          .then(applyFilter)
          .then(noteAfter)
          .then(appendPosts)
          .then(loading.bind(null, false))
          .then(m.redraw, handleError);
      } else {
        setHash('');
        resetPosts();
      }
    };

    var getMessage = function() {
      if(failed()) {
        return 'Failed to load subreddit. Please check name and try again.';
      } else if(!subreddit()) {
        return 'Please enter a subreddit and press enter.';
      }
    };
    // -- END PUBLIC

    // read hash and load posts if appropriate
    if(readState()) {
      loadPosts();
    }

    return {
      // props
      loading: loading,
      posts: posts,
      subreddit: subreddit,
      filter: filter,
      nsfw: nsfw,
      // funcs
      getMessage: getMessage,
      loadPosts: loadPosts,
      handleSubmit: handleSubmit,
    };

  };

  app.view = function(ctrl, args) {
    if(!ctrl.loading() && ctrl.posts().length > 0 && ctrl.posts().length <= app.state.limit + app.const.ADD_MORE_THRESHOLD) {
      ctrl.loadPosts();
    }
    return m('div.window', {
      class: app.state.openPost ? 'noscroll' : ''
    }, [
      m('h1.header', 'Ayy Rmao'),
      m('form.sr-form', { onsubmit: ctrl.handleSubmit }, [
        m('input[type=text][placeholder=subreddit]', { onchange: util.withAttrNoRedraw('value', ctrl.subreddit), value: ctrl.subreddit(), autofocus: !ctrl.subreddit() }),
        m('input[type=text][placeholder=filter]', { onchange: util.withAttrNoRedraw('value', ctrl.filter), value: ctrl.filter() }),
        m('label', [
          m('input[type=checkbox]', { onclick: util.withAttrNoRedraw('checked', ctrl.nsfw), checked: ctrl.nsfw() }),
          m('span', 'nsfw?')
        ]),
        m('button[type=submit].hidden')
      ]),
      app.state.openPost ? m(PostCommentsModal) : '',
      ctrl.loading() ? m(pl.Loading, {}) : m(PostList, { posts: ctrl.posts, message: ctrl.getMessage() })
    ]);
  };

  app.mountElem = util.id('app');

  m.mount(app.mountElem, app);

}());
