var win = $(window),
  doc = $(document),
  form = $('#redditSearch'),
  txtSearch = $('#txtSearch'),
  output = $('div.output'),
  chkNsfw = $('#chkNsfw'),
  controls = $('div.controls').hide(),
  nsfw = false,
  query, lastEl, lastHash,
  posts = [],
  viewed = [],
  help = $('div.help'),
  message = $('div.message > p').hide(),
  baseUrl = "http://www.reddit.com";

var MOBILE = isMobile(),
  NUM_LOAD = 5;

form.submit(function(evt) {
  var hash = '';
  query = txtSearch.val();
  output.empty();
  posts = [];
  viewed = [];
  lastEl = null;
  if (query) {
    if (chkNsfw.prop('checked')) {
      nsfw = true;
    } else {
      nsfw = false;
    }
    help.hide();
    controls.show();
    message.hide();
    hash = 'subreddit is ' + query + ' and nsfw is ' + (nsfw ? 'enabled' : 'disabled');
    txtSearch.blur();
    loadPosts();
  } else {
    help.show();
    controls.hide();
  }
  lastHash = hash;
  location.hash = hash;
  return false;
});

win.on('keydown', function(evt) {
  if (evt.ctrlKey && !evt.shiftKey) {
    if (evt.keyCode == 74) {
      window.scroll(0, 0);
      txtSearch.focus();
      txtSearch.select();
      return false;
    }
  }
});

win.on('hashchange', handleHash);
win.on('scroll', throttle(handleScroll, 300));

// handle hash as first step
handleHash();


// FUNCTIONS
function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function throttle(callback, limit) {
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

function pauseOtherVids(vid) {
  var clicked = $(vid);
  $('video').each(function() {
    if (this.dataset.playing && !$(this).is(clicked)) {
      this.pause();
    }
  });
}

function handleScroll(evt) {
  if (doc.height() - (win.height() + win.scrollTop()) < win.height()) {
    loadPosts();
  }
}

function getPosts(subreddit, params) {
  return $.getJSON(baseUrl + '/r/' + subreddit + '.json?limit=100' + (params ? '&' + params : '')).then(function(data) {
    return $.Deferred(function(deferred) {
      posts = data.data.children.filter(function(post) {
        return (nsfw || !post.data.over_18) && viewed.indexOf(post.data.name) === -1;
      });
      if (posts.length === 0) {
        deferred.reject('Nothing Here');
      } else {
        deferred.resolve();
      }
    }).promise();
  });
}

function removeUrlExtras(url) {
  return url.replace(/[\?#].+$/, '');
}

function handleHash() {
  if (location.hash.slice(1) === lastHash) return;
  var hash = parseHash();
  if (hash) {
    txtSearch.val(hash.subreddit);
    chkNsfw.prop('checked', hash.nsfw === 'enabled');
    form.submit();
  }
}

function parseHash() {
  if (!location.hash) return false;
  var obj = {};
  location.hash.slice(1).split(' and ').forEach(function(pair) {
    pair = pair.split(' is ');
    obj[pair[0]] = pair[1];
  });
  return obj;
}

function handleGfycat(res) {
  this.outDiv.outerHTML = makePost(this.title, makeVideo(res.gfyItem.webmUrl, 'webm'));
}

function loadPosts(num) {
  var promise;
  var param = (lastEl ? 'after=' + lastEl : '');
  num = num || NUM_LOAD;
  if (posts.length === 0) {
    promise = getPosts(query, param);
  }
  $.when(promise).then(function() {
    var i = 0;
    var post, linkTitle, url, comments, subreddit, title, out, score, numComments;
    for (; i < num; i++) {
      if (posts.length === 0) {
        return loadPosts(num - i);
      }
      post = posts.shift().data;
      viewed.push(post.name);
      lastEl = post.name;
      linkTitle = post.title.replace(/"/g, '&quot;');
      url = post.url;
      score = post.score;
      comments = baseUrl + post.permalink;
      subreddit = post.subreddit;
      numComments = post.num_comments;
      console.log(post);
      title = makeTitle(linkTitle, comments, subreddit, score, numComments);
      if (/\.webm([\?#].+)?$/i.test(url)) {
        out = makePost(title, makeVideo(removeUrlExtras(url), 'webm'));
      } else if (/imgur.+\.(gif|gifv)([\?#].+)?$/i.test(url)) {
        out = makePost(title, makeVideo(removeUrlExtras(url).replace(/\.[^\.]+$/, '.webm'), 'webm'));
      } else if (/\.(jpg|png|gif)([\?#].+)?$/i.test(url)) {
        out = makePost(title, makeImage(url));
      } else if (/imgur\.com\/[A-z0-9]+([\?#].+)?$/.test(url)) {
        out = makePost(title, makeImage('http://i.imgur.com/' + removeUrlExtras(url).match(/([^\/]+)$/)[0] + '.gif'));
      } else if (/imgur\.com\/(a|gallery)\/[A-z0-9]+([\?#].+)?$/.test(url)) {
        out = makePost(title, makeIframe(removeUrlExtras(url.replace(/\/gallery\//, '/a/')) + '/embed'));
      } else if (/gfycat\.com\/[A-z0-9]+([\?#].+)?$/.test(url)) {
        var div = document.createElement('div');
        output.append(div);
        $.getJSON('http://gfycat.com/cajax/get/' + removeUrlExtras(url).match(/gfycat\.com\/([A-z0-9]+)$/)[1], handleGfycat.bind({
          title: title,
          outDiv: div
        }));
      } else if (post.is_self) {
        out = makePost(title, makeSelf(post.author, htmlDecode(post.selftext_html)));
      } else {
        out = makePost(title, makeSelf(post.author, null, url, post.thumbnail));
      }
      if (out) {
        output.append(out);
      }
    }
    if (!output.html()) {
      output.append('<div>Nothing on this page...</div>');
    }
  }).fail(function(e) {
    console.error(e);
    message.text(e);
    message.show();
  });
}

function makePost(title, body) {
  return '<div>' + title + body + '</div>';
}

function makeTitle(title, comments, subreddit, score, numComments) {
  return '<div class="title"><a href="' +
    comments +
    '" target="_blank" title="' +
    subreddit +
    '">' +
    title +
    '</a></div><div class="info"><span class="score">' +
    score +
    '</span> points and <span class="num-comments">' +
    numComments +
    '</span> comments</div>';
}

function makeImage(src) {
  return "<img src='" + src + "'>";
}

function makeVideo(src, format) {
  return "<video class='video' " + (MOBILE ? "onclick='pauseOtherVids(this); if(this.dataset.playing) { this.dataset.playing = \"\"; this.pause(); } else { this.dataset.playing = \"yes\"; this.play(); }'" : "onmouseenter='this.play();' onmouseleave='this.pause()'") + " loop><source src='" +
    src + "' type='video/" + format + "'/></video>";
}

function makeSelf(username, text, url, thumb) {
  return "<div class='self'><div class='username'>" +
    username + " says: </div><div class='content'>" +
    (text || (thumb && '<div class="center"><a target="_blank" href="' + url + '">' + url + '</a><br><img src="' + thumb + '"/></div>') || "Nothing :'-(") +
    "</div></div>";
}

function makeIframe(url) {
  return '<iframe class="embed" frameborder="0" src="' + url + '"></iframe>';
}

function htmlDecode(input) {
  var e = document.createElement('div');
  e.innerHTML = input;
  return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
}
