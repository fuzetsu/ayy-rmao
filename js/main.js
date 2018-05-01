/*global m,location,localStorage */
(function() {

  let app = {};

  const API_URL = 'https://www.reddit.com';

  const IMAGES = {  
    loading: 'img/loading.gif'
  };

  const CSS = {
    DAY: `
.window {
  color: #333;
  background: white;
}

.modal {
  background: white;
}

.post-comment-info {
  color: #666;
}

.score-hidden {
  color: #999;
}

.post-comments-list a {
  color: #1b3e92;
}

.post-comment-collapse {
  color: black;
}

.self-post {
  box-shadow: none;
  border: 1px solid #aaa;
  border-radius: 5px;
}

::-webkit-scrollbar-track {
  background: #eee;
}

::-webkit-scrollbar-thumb {
  background: #ccc;
}
    `
  }

  // UTIL

  let util = {
    id: function(id) {
      return document.getElementById(id);
    },
    titleCase: function(str) {
      return str.replace(/([a-z]+)/gi, function(match) {
        return match.charAt(0).toUpperCase() + match.slice(1);
      });
    },
    htmlDecode: function(input) {
      let e = document.createElement('div');
      e.innerHTML = input;
      return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
    },
    throttle: function(limit, callback) {
      var wait = false;
      return function(...args) {
        if (!wait) {
          callback(...args);
          wait = true;
          setTimeout(function() {
            wait = false;
          }, limit);
        }
      };
    },
    withAttrNoRedraw: function(attr, func) {
      return e => {
        e.redraw = false;
        func(e.target[attr]);
      };
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
    },
    prettyTime(d) {
      // This function was copied, and slightly adapted from John Resig's website: https://johnresig.com/files/pretty.js
      let date = new Date(d);
      let diff = (Date.now() - date.getTime()) / 1000;
      let day_diff = Math.floor(diff / 86400);

      if (isNaN(day_diff) || day_diff < 0 || day_diff >= 31) return;

      return day_diff == 0 && (
          diff < 60 && "just now" ||
          diff < 120 && "1 minute ago" ||
          diff < 3600 && Math.floor(diff / 60) + " minutes ago" ||
          diff < 7200 && "1 hour ago" ||
          diff < 86400 && Math.floor(diff / 3600) + " hours ago") ||
        day_diff == 1 && "Yesterday" ||
        day_diff < 7 && day_diff + " days ago" ||
        day_diff < 31 && Math.ceil(day_diff / 7) + " weeks ago";
      }
  };

  // common actions
  let ex = {
    toggleExpand: function(type, e) {
      let target = e.target;
      let titled = util.titleCase(type);
      let style = target.style;
      let viewport = window['inner' + titled];
      let orig = (target['natural' + titled] || target['video' + titled] || '');
      let cur = target['client' + titled];
      let dim = style[type];
      if(!dim && (orig === cur || orig * 0.8 <= cur)) {
        dim = orig + '';
      }
      if (dim) {
        if (dim.includes(orig) && orig <= viewport * 0.99) {
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

  let Post = function() {};
  Post.list = function(subreddit, after, nsfw) {
    return m.request({
      method: 'GET',
      url: `${API_URL}/r/${subreddit}.json?limit=${app.const.REQUEST_NUM}&after=${after}`,
      background: true
    }).then(function(data) {
      return data.data.children
        .filter(post => (nsfw || !post.data.over_18) && !app.state.viewed.includes(post.data.name))
        .map(post => {
          app.state.viewed.push(post.data.name);
          return detectPostType(post.data);
        });
    });
  };
  
  let Comments = function() {};
  Comments.list = function(post) {
    let link = post.permalink.slice(-1) === '/' ? post.permalink.slice(0, -1) : post.permalink;
    return m.request({
      method: 'GET',
      url: API_URL + link + '.json',
      background: true
    }).then(function(data) {
      return data[1].data.children;
    });
  };

  // COMPONENTS

  // container for post layouts
  let pl = {};

  pl.Video = {
    play: e => e.target.play(),
    pause: e => e.target.pause(),
    toggleExpand: ex.toggleExpand.bind(null, 'height'),
    view(vnode) {
      let post = vnode.attrs.post;
      return m('.video-post', [
        m('video.video[loop][preload=metadata]', { onmouseenter: this.play, onmouseleave: this.pause, onclick: this.toggleExpand }, [
          m('source[type=video/mp4]', { src: post.url })
        ])
      ]);
    }
  };

  pl.Image = {
    toggleExpand: ex.toggleExpand.bind(null, 'width'),
    view(vnode) {
      let post = vnode.attrs.post;
      return m('.image-post', [
        m('img', { src: post.url, onclick: this.toggleExpand })
      ]);
    }
  };

  pl.Embed = {
    oninit(vnode) {
      this.loaded = false;
    },
    view(vnode) {
      let post = vnode.attrs.post;
      let url = post.url;
      if(location.protocol === 'https:') {
        url = url.replace(/^.+:/, location.protocol);
      }
      return m('.embed-post', [
        this.loaded ? m('iframe.embed[frameborder=0]', { src: url }) : m('button.load-embed', { onclick: e => this.loaded = true }, 'Load ' + (post.desc || 'Embedded Content'))
      ]);
    }
  };

  pl.Self = {
    view(vnode) {
      var post = vnode.attrs.post;
      return m('.self-post', [
        m('.username', post.author + ' says: '),
        m('.content', post.selftext_html ? m.trust(util.htmlDecode(post.selftext_html)) : post.title)
      ]);
    }
  };

  pl.Link = {
    view(vnode) {
      var post = vnode.attrs.post;
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
    oninit(vnode) {
      let args = vnode.attrs;
      if(args.post && args.post.parseAsync) {
        args.post.parseAsync(args.post.url, args.post).then(function(url) {
          args.post.parseAsync = null;
          args.post.url = url;
          m.redraw();
        });
      }
    },
    view(vnode) {
      return m('.loading', [
        m('img', { src: IMAGES.loading })
      ]);
    }
  };

  // the base list of attributes to copy
  let baseAttrs = ['name', 'permalink', 'subreddit', 'score', 'num_comments', 'title'];

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
      return `http://i.imgur.com/${url.match(/([^\/]+)$/)[0]}.gif`;
    }},
    { type: 'Embed', desc: 'Imgur Gallery', match: /imgur\.com\/(a|gallery)\/[a-z0-9]+$/i, parse: function(url) {
      return url.replace(/\/gallery\//, '/a/').replace(/^http:/, 'https:') + '/embed?pub=true&analytics=false';
    }},
    { type: 'Video', match: /gfycat\.com\/[a-z0-9]+$/i, strip: true, parseAsync: function(url) {
      return m.jsonp({
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
  let detectPostType = function(post) {
    let url = post.url.replace(/[\?#].*$/, '');
    let npost = {};
    postTypes.some(type => {
      if((typeof type.match === 'function' ? type.match(post) : type.match.test(url))) {
        baseAttrs.concat(type.fields || []).forEach(field => npost[field] = post[field]);
        ['type', 'parseAsync', 'desc'].forEach(field => npost[field] = type[field]);
        npost.url = type.parse ? type.parse(type.strip === false ? post.url : url) : (type.strip ? url : post.url);
        return true;
      }
    });
    return npost;
  };

  let ScoreIndicator = {
    isGoodScore(score) {
      if(score >= 500) return 'super-good';
      if(score >= 20) return 'real-good';
      if(score >= 1) return 'kinda-good';
      if(score >= -5) return 'bad';
      if(score >= -20) return 'real-bad';
      return 'super-bad';
    },
    view(vnode) {
      return m('span.score', {
        class: this.isGoodScore(vnode.attrs.score),
      }, vnode.attrs.score);
    }
  };

  let PostInfo = {
    view(vnode) {
      let post = vnode.attrs.post;
      return m('div', [
        m('.title', [
          m('a[target=_blank]', { 
            href: API_URL + post.permalink,
            title: post.subreddit,
            onclick: function(e) {
              if(e.ctrlKey || vnode.attrs.readOnly) return;
              e.preventDefault();
              app.state.openPost = post;
            }
          }, m.trust(post.title)),
        ]),
        m('.info', [
          m(ScoreIndicator, { score: post.score }),
          ' ', util.pluralize('point', post.score), ' and ',
          m('span.num-comments', post.num_comments),
          ' comments on ',
          m('span.sub-name', [
            m('a', {
              href: `#subreddit is ${post.subreddit} and nsfw is ${app.state.nsfw ? 'enabled' : 'disabled'}`,
              onclick: e => {
                if(e.button === 0) setTimeout(() => location.reload(), 200);
              }
            }, post.subreddit)
          ])
        ])
      ]);
    }
  };

  let PostItem = {
    view(vnode) {
      var post = vnode.attrs.post;
      var comp = pl[post.type];
      return m('.post', [
        !vnode.attrs.noInfo ? m(PostInfo, { post: post })  : '',
        post.parseAsync ? m(pl.Loading, { post: post }) : (
          m(comp, { post: post })
        )
      ]);
    }
  };

  let PostList = {
    view(vnode) {
      let posts = vnode.attrs.posts
        .slice(0, app.state.limit)
        .map(post => m(PostItem, { post: post }));
      return m('.post-list', posts.length > 0 ? posts : m('p.message', vnode.attrs.message || 'Nothing here...'));
    }
  };
  
  let Modal = {
    view(vnode) {
      let args = vnode.attrs;
      return m('div.overlay', {
        onclick: e => {
          if(args.onclose && e.target.classList.contains('overlay')) {
            args.onclose(); 
          } else {
            e.redraw = false;
          }
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
  
  let PostCommentsModal = {
    onclose: () => app.state.openPost = null,
    view: function(ctrl, args) {
      let post = app.state.openPost;
      return m(Modal, {
        onclose: this.onclose,
        header: m('div.center', m(PostInfo, { post: post, readOnly: true })),
        content: m(PostComments, { post: post })
      });
    }
  };
  
  let PostComments = {
    oninit(vnode) {
      this.comments = [];
      this.loading = true;
      this.post = vnode.attrs.post;
      // load comments
      Comments.list(this.post).then(data => {
        this.comments = data;
        this.loading = false;
        m.redraw();
      });
    },
    view(vnode) {
      if(this.loading) return m('div.center', m(pl.Loading, {}));
      return m('div.post-comments', [
        m('div.center', m(PostItem, { post: this.post, noInfo: true })),
        m('div.post-comments-list', this.comments.map((c, idx, arr) => {
          if(c.kind === 'more') return m(LoadMoreComments, { parentArray: arr, moreComments: c.data });
          return m(PostComment, {comment: c.data });
        }))
      ]);
    }
  };
  
  let LoadMoreComments = {
    loading: false,
    view(vnode) {
      if(this.loading) return m(pl.Loading, {});
      let args = vnode.attrs;
      let mc = args.moreComments;
      // dont show button if no comments to load...
      if(mc.count <= 0) return '';
      return m('a.btn-load-more-comments[href=#]', {
        onclick: e => {
          e.preventDefault();
          this.loading = true;
          m.request({
            method: 'GET',
            url: API_URL + '/api/morechildren.json',
            data: {
              api_type: 'json',
              children: mc.children.join(','),
              link_id: app.state.openPost.name
            }
          }).then(data => {
            this.loading = false;
            console.log('more comments => ', data);
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
  
  let _depthColors = {};
  let PostComment = {
    view(vnode) {
      let cmt = vnode.attrs.comment;
      let createdAt = new Date(cmt.created_utc * 1000);
      let editedAt = cmt.edited && new Date(cmt.edited * 1000);
      let borderColor = _depthColors[cmt.depth];
      if(!borderColor) {
        borderColor = util.genColor(12, cmt.depth);
        _depthColors[cmt.depth] = borderColor;
      }
      return m('div.post-comment', {
        style: `border-left-color: ${borderColor};`
      }, [
        m('div.post-comment-info', [
          m('strong.post-comment-collapse', {
            onclick: e => cmt.collapsed = !cmt.collapsed
          }, '[', cmt.collapsed ? '+' : '-', '] '),
          m('span.post-comment-author', { class: cmt.is_submitter ? 'post-comment-op' : '' }, cmt.author),
          m.trust(' &#x2022; '),
          cmt.score_hidden ? m('em.score-hidden', 'Score Hidden') : m(ScoreIndicator, { score: cmt.score }),
          m.trust(' &#x2022; '),
          util.prettyTime(createdAt) || createdAt.toLocaleString(),
          editedAt ? [m.trust(' &#x2022; '), ' edited ', util.prettyTime(editedAt) || editedAt.toLocaleString()] : '', m.trust(' &#x2022; '),
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

  window.addEventListener('hashchange', e => {
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
    subreddit: '',
    nsfw: false,
    filter: localStorage[app.const.FKEY] || '',
  };
  
  let AyyRmao = {
    oninit(vnode) {
      this.loading = false;
      this.posts = [];
      this.dayMode = localStorage['day_mode'] || false;
      // read hash and load posts if appropriate
      if(this.readState()) {
        this.loadPosts();
      }
    },
    somethingChanged() {
      let c = app.state;
      return c.subreddit !== this.subreddit || c.nsfw !== this.nsfw || c.filter !== this.filter;
    },
    loadPosts() {
      if(this.subreddit) {
        if(this.somethingChanged()) {
          this.loading = true;
          this.resetPosts();
        }
        this.failed = false;
        this.writeState();
        let after = this.posts.length > 0 ? this.posts[this.posts.length - 1].name : '';
        Post.list(this.subreddit, after, this.nsfw)
          // apply filter
          .then(newPosts => {
            if(!this.filter) return newPosts;
            let filtered = this.filter.split('+');
            return newPosts.filter(post => !filtered.includes(post.subreddit));
          })
          // combine post lists
          .then(newPosts => {
            this.posts = this.posts.concat(newPosts);
            this.loading = false;
            m.redraw();
          }, err => {
            if(err) console.log(err);
            this.loading = false;
            this.failed = true;
            m.redraw();
          });
      } else {
        this.setHash('');
        this.resetPosts();
      }
    },
    syncWithAppState() {
      let c = app.state;
      c.subreddit = this.subreddit;
      c.nsfw = this.nsfw;
      c.filter = this.filter;
    },
    resetPosts() {
      this.posts = [];
      this.syncWithAppState();
      let c = app.state;
      c.viewed.length = 0;
      c.limit = app.const.FIRST_LOAD_NUM;
    },
    handleSubmit(e) {
      e.preventDefault();
      if(this.somethingChanged()) {
        this.loadPosts();
      }
    },
    readState() {
      let hash = decodeURIComponent(location.hash);
      if(hash) {
        let state = {};
        hash.slice(1).split(' and ').forEach(thing => {
          let pair = thing.split(' is ');
          state[pair[0]] = pair[1];
        });
        if('subreddit' in state) {
          this.subreddit = state.subreddit;
        }
        if('nsfw' in state) {
          this.nsfw = state.nsfw === 'enabled';
        }
        if('filter' in state) {
          localStorage[app.const.FKEY] = state.filter;
          this.filter = state.filter;
        }
        return true;
      }
      return false;
    },
    writeState() {
      this.syncWithAppState();
      localStorage[app.const.FKEY] = this.filter;
      this.setHash('subreddit is ' + this.subreddit + (this.filter ? ' and filter is ' + this.filter : '') + ' and nsfw is ' + (this.nsfw ? 'enabled' : 'disabled'));
    },
    setHash(hash) {
      clearInterval(app.state.timeoutId);
      app.state.changingHash = true;
      location.hash = hash;
      app.state.timeoutId = setTimeout(() => app.state.changingHash = false, 500);
    },
    getMessage() {
      if(this.failed) {
        return 'Failed to load subreddit. Please check name and try again.';
      } else if(!this.subreddit) {
        return 'Please enter a subreddit and press enter.';
      }
    },
    handleScroll(e) {
      let scrollTop = e.target.scrollTop;
      if(e.target.scrollHeight - (window.innerHeight + scrollTop) < window.innerHeight) {
        app.state.limit += app.const.LOAD_NUM;
      } else {
        e.redraw = false;
      }
    },
    view(vnode) {
      if(!this.loading && this.posts.length > 0 && this.posts.length <= app.state.limit + app.const.ADD_MORE_THRESHOLD && app.state.limit !== this.lastLimit) {
        this.loadPosts();
      }
      this.lastLimit = app.state.limit;
      return m('div.window', {
        onscroll: util.throttle(250, this.handleScroll),
        class: app.state.openPost ? 'noscroll' : ''
      }, [
        m('h1.header', 'Ayy Rmao'),
        m('div.theme-changer', {
          onclick: e => {
            this.dayMode = !this.dayMode;
            localStorage['day_mode'] = this.dayMode;
          }
        }, this.dayMode ? '\u{1F31D}' : '\u{1F31E}'),
        m('style', this.dayMode ? CSS.DAY : ''),
        m('form.sr-form', { onsubmit: e => this.handleSubmit(e) }, [
          m('input[type=text][placeholder=subreddit]', { onchange: util.withAttrNoRedraw('value', v => this.subreddit = v), value: this.subreddit, autofocus: !this.subreddit }),
          m('input[type=text][placeholder=filter]', { onchange: util.withAttrNoRedraw('value', v => this.filter = v), value: this.filter }),
          m('label', [
            m('input[type=checkbox]', { onclick: util.withAttrNoRedraw('checked', v => this.nsfw = v), checked: this.nsfw }),
            m('span', 'nsfw?')
          ]),
          m('button[type=submit].hidden')
        ]),
        app.state.openPost ? m(PostCommentsModal) : '',
        this.loading ? m(pl.Loading, {}) : m(PostList, { posts: this.posts, message: this.getMessage() })
      ]);
    }
  };

  m.mount(util.id('app'), AyyRmao);

}());
