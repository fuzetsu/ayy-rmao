(function() {

  var app = {};

  var API_URL = 'http://www.reddit.com';

  // MODELS

  var Post = function() {};
  Post.list = function(subreddit, after) {
    return m.request({
      method: 'GET',
      url: API_URL + '/r/' + subreddit + '.json?limit=100&after=' + after
    }).then(function(data) {
      return data.data.children.map(function(post) {
        return post.data;
      });
    });
  };

  // COMPONENTS

  var PostList = {
    controller: function(args) {
      // the posts to load
      this.posts = args.posts;
      // the posts already displayed
      this.viewed = m.prop(args.viewed || []);
      this.getPostContainer = function(post) {

      };
    },
    view: function(ctrl, args) {
      var posts = ctrl.posts().map(function(post) {
        return m('.post', post.name);
      });
      return m('.post-list', (posts.length > 0 ? posts : [
        m('p', 'Nothing Here...')
      ]));
    }
  };

  // GLOBAL EVENTS

  window.addEventListener('scroll', function(e) {

  });

  // APP

  app.controller = function() {
    // running list of posts
    this.posts = m.prop([]);
    // the subreddit to load
    this.subreddit = m.prop('');
    // starting point for post loading
    this.after = m.prop('');
    // whether or not to allow nsfw posts
    this.nsfw = m.prop(false);

    this.filterPosts = function(posts) {
      var allowNsfw = this.nsfw();
      var validPosts = posts.filter(function(post) { return allowNsfw || !post.over_18; });
      this.after(validPosts[validPosts.length - 1].name);
      return validPosts;
    }.bind(this);

    this.loadPosts = function(e) {
      e.preventDefault();
      Post.list(this.subreddit(), this.after()).then(this.filterPosts).then(this.posts);
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
