;(function(w) {
  var saved = [];
  var panels = [];
  var previousOverflow = '';
  var focusables = function() {
    var nodes = [];
    panels.forEach(function(panel) {
      if (!panel) return;
      if (panel.matches('button, a[href], input, [tabindex]')) nodes.push(panel);
      nodes = nodes.concat(Array.prototype.slice.call(panel.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')));
    });
    return nodes.filter(function(el) { return !el.disabled && el.tabIndex >= 0 && el.getClientRects().length && !el.closest('[inert]'); });
  };
  var close = function() {
    if (!panels.length) return;
    saved.forEach(function(item) { item.el.inert = item.inert; });
    saved = [];
    panels = [];
    w.document.body.style.overflow = previousOverflow;
  };
  w.SignalAyuModal = {
    open: function(roots, background) {
      close();
      panels = roots.filter(Boolean);
      previousOverflow = w.document.body.style.overflow;
      w.document.body.style.overflow = 'hidden';
      background.filter(Boolean).forEach(function(el) { saved.push({ el: el, inert: el.inert }); el.inert = true; });
    },
    close: close
  };
  w.document.addEventListener('keydown', function(e) {
    if (e.key !== 'Tab' || !panels.length) return;
    var nodes = focusables();
    if (!nodes.length) { e.preventDefault(); return; }
    var index = nodes.indexOf(w.document.activeElement);
    if (e.shiftKey && index <= 0) { e.preventDefault(); nodes[nodes.length - 1].focus(); }
    else if (!e.shiftKey && (index < 0 || index === nodes.length - 1)) { e.preventDefault(); nodes[0].focus(); }
  });
})(window);

;(function(w) {
  var init = function() {
    w.document.querySelectorAll('.article-view table').forEach(function(table) {
      if (table.closest('.another_category, .tt-calendar, [data-signal-system-table]')) return;
      table.classList.add('ayu-content-table');
      var wrapper = table.parentElement;
      if (!wrapper.classList.contains('ayu-table-scroll')) {
        wrapper = w.document.createElement('div');
        wrapper.className = 'ayu-table-scroll';
        wrapper.tabIndex = 0;
        wrapper.setAttribute('role', 'region');
        wrapper.setAttribute('aria-label', table.caption ? table.caption.textContent.trim() : '본문 표 (가로 스크롤)');
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      }
    });
  };
  w.SignalAyuTables = { init: init };
  if (w.document.readyState === 'loading') w.document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);

;(function(w) {
  var init = function() {
    var doc = w.document;
    var menu = doc.querySelector('#dkGnb');
    var menuButton = doc.querySelector('.btn_menu');
    var closeButton = doc.querySelector('.btn_close');
    var menuOpen = false;
    if (doc.documentElement.__signalControlsBound) return;
    doc.documentElement.__signalControlsBound = true;
    var expanded = function(button, value) { if (button) button.setAttribute('aria-expanded', String(value)); };
    var closeMenu = function(restore) {
      if (!menuOpen) return;
      menuOpen = false;
      doc.body.classList.remove('layer_on');
      expanded(menuButton, false);
      expanded(doc.querySelector('.btn_search'), false);
      menu.removeAttribute('role'); menu.removeAttribute('aria-modal'); menu.removeAttribute('aria-label');
      w.SignalAyuModal.close();
      if (restore !== false && menuButton) menuButton.focus();
    };
    if (menu && menuButton) {
      menuButton.addEventListener('click', function() {
        if (menuOpen) { closeMenu(); return; }
        menuOpen = true;
        doc.body.classList.add('layer_on');
        expanded(menuButton, true);
        expanded(doc.querySelector('.btn_search'), true);
        menu.setAttribute('role', 'dialog'); menu.setAttribute('aria-modal', 'true'); menu.setAttribute('aria-label', '사이트 메뉴');
        w.SignalAyuModal.open([closeButton, menu], [doc.querySelector('#dkHead'), doc.querySelector('#dkContent'), doc.querySelector('#mEtc'), doc.querySelector('#dkFoot'), doc.querySelector('#tocMobileBtn')]);
        if (closeButton) closeButton.focus();
      });
      [closeButton, doc.querySelector('.dimmed_layer')].filter(Boolean).forEach(function(el) { el.addEventListener('click', closeMenu); });
      w.addEventListener('resize', function() {
        if (menuOpen && w.innerWidth > 820) {
          closeMenu(false);
          var control = menu.querySelector('button');
          if (control) control.focus();
        }
      });
    }
    var bindDisclosure = function(rootSelector, buttonSelector, className) {
      var root = doc.querySelector(rootSelector);
      var button = root && root.querySelector(buttonSelector);
      if (!button) return;
      var close = function() { root.classList.remove(className); expanded(button, false); };
      button.addEventListener('click', function() { var on = root.classList.toggle(className); expanded(button, on); });
      root.addEventListener('keydown', function(e) { if (e.key === 'Escape' && root.classList.contains(className)) { e.preventDefault(); e.stopPropagation(); close(); button.focus(); } });
      root.addEventListener('focusout', function(e) { if (!root.contains(e.relatedTarget)) close(); });
    };
    bindDisclosure('.area_profile', '.btn_name', 'on');
    bindDisclosure('.area_navi', '.btn_cate', 'on');
    var search = doc.querySelector('.area_search');
    var searchButton = search && search.querySelector('.btn_search');
    var input = search && search.querySelector('.tf_search');
    if (searchButton && input) {
      searchButton.addEventListener('click', function() { search.classList.add('on'); expanded(searchButton, true); input.focus(); });
      search.addEventListener('keydown', function(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); search.classList.remove('on'); expanded(searchButton, false); if (menuOpen) closeMenu(); else searchButton.focus(); } });
      input.addEventListener('blur', function() { if (!input.value) { search.classList.remove('on'); expanded(searchButton, false); } });
    }
    doc.addEventListener('keydown', function(e) { if (e.key === 'Escape' && menuOpen) closeMenu(); });
  };
  w.SignalAyuControls = { init: init };
  if (w.document.readyState === 'loading') w.document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);

;(function(w) {
	// Convert only plain text nodes; never rebuild article DOM or code-copy controls.
	var init = function() {
		var containers = w.document.querySelectorAll(".article-view .tt_article_useless_p_margin.contents_style");
		for (var i = 0; i < containers.length; i++) {
			var walker = w.document.createTreeWalker(containers[i], 4);
			var nodes = [];
			var node;
			while ((node = walker.nextNode())) {
				if (node.nodeValue.indexOf("`") < 0) continue;
				if (node.parentElement.closest("pre, code, a, button, script, style, textarea, select, figure, svg, math, .ayu-code-wrap, [contenteditable]")) continue;
				nodes.push(node);
			}
			for (var j = 0; j < nodes.length; j++) {
				node = nodes[j];
				var text = node.nodeValue;
				var pattern = /`([^`\r\n]+)`/g;
				var fragment = w.document.createDocumentFragment();
				var last = 0;
				var match;
				while ((match = pattern.exec(text))) {
					if (text.charAt(match.index - 1) === "`" || text.charAt(pattern.lastIndex) === "`") continue;
					fragment.appendChild(w.document.createTextNode(text.slice(last, match.index)));
					var code = w.document.createElement("code");
					code.textContent = match[1];
					fragment.appendChild(code);
					last = pattern.lastIndex;
				}
				if (!last) continue;
				fragment.appendChild(w.document.createTextNode(text.slice(last)));
				node.parentNode.replaceChild(fragment, node);
			}
		}
	};
	w.SignalAyuInlineCode = { init: init };
	if (w.document.readyState === "loading") {
		w.document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})(window);

;(function(w) {
	var KEY = "theme",
		DEFAULT_THEME = "dark",
		root = w.document.documentElement;

	var getCurrentTheme = function() {
		var theme = root.getAttribute("data-theme");
		return theme === "light" || theme === "dark" ? theme : DEFAULT_THEME;
	};

	var syncButton = function(theme) {
		var btn = w.document.querySelector(".btn_theme");
		if (!btn) {
			return;
		}
		var isDark = theme === "dark";
		btn.textContent = isDark ? "☀️" : "🌙";
		btn.setAttribute("aria-label", isDark ? "라이트모드로 전환" : "다크모드로 전환");
		btn.setAttribute("aria-pressed", isDark ? "true" : "false");
	};

	var applyTheme = function(theme) {
		root.setAttribute("data-theme", theme);
		try {
			w.localStorage.setItem(KEY, theme);
		} catch (e) {}
		syncButton(theme);
	};

	var toggleTheme = function() {
		applyTheme(getCurrentTheme() === "dark" ? "light" : "dark");
	};

	var initTheme = function() {
		var btn = w.document.querySelector(".btn_theme");
		applyTheme(getCurrentTheme());
		if (btn && !btn.__signalAyuThemeBound) {
			btn.addEventListener("click", toggleTheme);
			btn.__signalAyuThemeBound = true;
		}
	};

w.SignalAyuTheme = {
		init: initTheme,
		apply: applyTheme,
		current: getCurrentTheme
	};
})(window);

;(function(w) {
	var state = {
		entries: [],
		headerOffset: 92,
		mobileOpen: false,
		initialized: false
	};

	var byId = function(id) {
		return w.document.getElementById(id);
	};

	var isPermalinkContext = function() {
		var body = w.document.body;
		var skinView;
		var bodyId;
		var listLikeTokens;
		var i;
		var categoryLink;
		var articleViews;
		var titleNode;
		if (!body) {
			return false;
		}



		skinView = w.document.querySelector(".skin_view");
		if (!skinView) {
			return false;
		}

		bodyId = (body.id || "").toLowerCase();
		listLikeTokens = ["index", "category", "tag", "search", "archive", "guestbook"];

		for (i = 0; i < listLikeTokens.length; i++) {
			if (bodyId.indexOf(listLikeTokens[i]) >= 0) {
				return false;
			}
		}

		// This skin's true post permalink includes a category link with href.
		categoryLink = skinView.querySelector(".area_title .tit_category a[href]");
		if (!categoryLink && !/^(notice|page)$/.test(skinView.getAttribute("data-article-kind") || "")) {
			return false;
		}

		articleViews = skinView.querySelectorAll(".area_view.article-view");
		if (articleViews.length !== 1) {
			return false;
		}

		titleNode = skinView.querySelector(".area_title .tit_post");
		return !!titleNode;
	};

	var getArticleContainer = function() {
		var articleView;
		if (!isPermalinkContext()) {
			return null;
		}
		articleView = w.document.querySelector(".skin_view .area_view.article-view");
		if (!articleView) {
			return null;
		}
		return articleView.querySelector(".tt_article_useless_p_margin") || articleView;
	};

	var slugify = function(text) {
		return (text || "")
			.toLowerCase()
			.trim()
			.replace(/\s+/g, "-")
			.replace(/[^\w\-가-힣]/g, "")
			.replace(/\-+/g, "-")
			.replace(/^\-+|\-+$/g, "") || "toc-heading";
	};

	var ensureHeadingId = function(el, usedIds) {
		if (el.id && !usedIds[el.id] && w.document.getElementById(el.id) === el) {
			usedIds[el.id] = true;
			return el.id;
		}
		var clone = el.cloneNode(true);
		var anchor = clone.querySelector(".heading-anchor");
		if (anchor) anchor.remove();
		var base = slugify(clone.textContent);
		var candidate = base;
		var n = 2;
		while (usedIds[candidate] || w.document.getElementById(candidate)) {
			candidate = base + "-" + n;
			n++;
		}
		el.id = candidate;
		usedIds[candidate] = true;
		return candidate;
	};

	var pickHeadingMode = function(container) {
		if (container.querySelector("h1")) {
			return { topTag: "H1", childTag: "H2" };
		}
		if (container.querySelector("h2")) {
			return { topTag: "H2", childTag: "H3" };
		}
		if (container.querySelector("h3")) {
			return { topTag: "H3", childTag: "H4" };
		}
		return null;
	};

	var buildEntries = function(container) {
		var mode = pickHeadingMode(container);
		var usedIds = Object.create(null);
		var raw = [];
		var nodes;
		var i;
		var flat;

		if (!mode) {
			return [];
		}

		nodes = container.querySelectorAll(mode.topTag.toLowerCase() + ", " + mode.childTag.toLowerCase());

		for (i = 0; i < nodes.length; i++) {
			var el = nodes[i];
			var tag = el.tagName;
			if (tag !== mode.topTag && tag !== mode.childTag) {
				continue;
			}
			var clone = el.cloneNode(true);
			var anchors = clone.querySelectorAll(".heading-anchor");
			for (var j = 0; j < anchors.length; j++) anchors[j].remove();
			var text = (clone.textContent || "").trim();
			if (!text) {
				continue;
			}
			raw.push({
				id: ensureHeadingId(el, usedIds),
				text: text,
				tag: tag,
				el: el
			});
		}

		if (raw.length < 2) {
			return [];
		}

		var nested = [];
		var currentTop = null;
		for (i = 0; i < raw.length; i++) {
			var item = raw[i];
			if (item.tag === mode.topTag) {
				currentTop = {
					id: item.id,
					text: item.text,
					level: 1,
					el: item.el,
					children: []
				};
				nested.push(currentTop);
				continue;
			}
			if (!currentTop) {
				continue;
			}
			currentTop.children.push({
				id: item.id,
				text: item.text,
				level: 2,
				el: item.el
			});
		}

		flat = [];
		for (i = 0; i < nested.length; i++) {
			flat.push(nested[i]);
			var j;
			for (j = 0; j < nested[i].children.length; j++) {
				flat.push(nested[i].children[j]);
			}
		}

		return flat.length >= 2 ? nested : [];
	};

	var escapeHtml = function(text) {
		return (text || "")
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#39;");
	};

	var escapeAttr = function(text) {
		return escapeHtml(text);
	};

	var renderList = function(tree) {
		var html = ['<ul class="toc-list">'];
		var i;
		for (i = 0; i < tree.length; i++) {
			var top = tree[i];
			html.push('<li class="toc-item toc-item-l1"><a class="toc-link toc-link-l1" href="#' + escapeAttr(top.id) + '" data-target="' + escapeAttr(top.id) + '">' + escapeHtml(top.text) + "</a>");
			if (top.children && top.children.length) {
				html.push('<ul class="toc-sublist">');
				var j;
				for (j = 0; j < top.children.length; j++) {
					var child = top.children[j];
					html.push('<li class="toc-item toc-item-l2"><a class="toc-link toc-link-l2" href="#' + escapeAttr(child.id) + '" data-target="' + escapeAttr(child.id) + '">' + escapeHtml(child.text) + "</a></li>");
				}
				html.push("</ul>");
			}
			html.push("</li>");
		}
		html.push("</ul>");
		return html.join("");
	};

	var updateHeaderOffset = function() {
		var head = w.document.querySelector(".area_head");
		state.headerOffset = (head ? head.offsetHeight : 80) + 12;
	};

	var scrollToHeading = function(id, behavior) {
		var target = byId(id);
		if (!target) {
			return;
		}
		updateHeaderOffset();
		var top = target.getBoundingClientRect().top + w.pageYOffset - state.headerOffset;
		w.scrollTo({ top: top, behavior: behavior || "smooth" });
	};

	var flattenTree = function(tree) {
		var out = [];
		var i;
		for (i = 0; i < tree.length; i++) {
			out.push(tree[i]);
			var j;
			for (j = 0; j < tree[i].children.length; j++) {
				out.push(tree[i].children[j]);
			}
		}
		return out;
	};

	var setActive = function(activeId) {
		var links = w.document.querySelectorAll(".toc-link");
		var i;
		for (i = 0; i < links.length; i++) {
			var on = links[i].getAttribute("data-target") === activeId;
			links[i].classList.toggle("is-active", on);
			if (on) {
				links[i].setAttribute("aria-current", "true");
			} else {
				links[i].removeAttribute("aria-current");
			}
		}
	};

	var updateActiveByScroll = function() {
		if (!state.entries.length) {
			return;
		}
		updateHeaderOffset();
		var marker = state.headerOffset + 8;
		var activeId = state.entries[0].id;
		var i;
		for (i = 0; i < state.entries.length; i++) {
			if (state.entries[i].el.getBoundingClientRect().top <= marker) {
				activeId = state.entries[i].id;
			} else {
				break;
			}
		}
		setActive(activeId);
	};

	var closeMobile = function(restoreFocus) {
		var panel = byId("tocMobilePanel");
		var backdrop = byId("tocMobileBackdrop");
		var btn = byId("tocMobileBtn");
		state.mobileOpen = false;
		if (w.SignalAyuModal) w.SignalAyuModal.close();
		if (panel) panel.hidden = true;
		if (backdrop) backdrop.hidden = true;
		if (btn) {
			btn.setAttribute("aria-expanded", "false");
			if (restoreFocus !== false) btn.focus();
		}
	};

	var openMobile = function() {
		var panel = byId("tocMobilePanel");
		var backdrop = byId("tocMobileBackdrop");
		var btn = byId("tocMobileBtn");
		state.mobileOpen = true;
		if (w.SignalAyuModal) w.SignalAyuModal.open([panel], [w.document.querySelector(".wrap_skin"), byId("tocFloating")]);
		if (panel) panel.hidden = false;
		if (backdrop) backdrop.hidden = false;
		if (btn) btn.setAttribute("aria-expanded", "true");
		var closeBtn = byId("tocMobileClose");
		if (closeBtn) closeBtn.focus();
	};

	var bindEvents = function() {
		if (state.initialized) {
			return;
		}
		var clickHandler = function(e) {
			var link = e.target.closest(".toc-link");
			if (!link) return;
			e.preventDefault();
			var id = link.getAttribute("data-target");
			scrollToHeading(id);
			if (w.history && w.history.replaceState) w.history.replaceState(null, "", "#" + encodeURIComponent(id));
			if (state.mobileOpen) {
				closeMobile();
			}
		};

		var desktop = byId("tocNavDesktop");
		var mobile = byId("tocNavMobile");
		if (desktop) desktop.addEventListener("click", clickHandler);
		if (mobile) mobile.addEventListener("click", clickHandler);

		var btn = byId("tocMobileBtn");
		var closeBtn = byId("tocMobileClose");
		var backdrop = byId("tocMobileBackdrop");
		if (btn) {
			btn.addEventListener("click", function() {
				if (state.mobileOpen) closeMobile();
				else openMobile();
			});
		}
		if (closeBtn) closeBtn.addEventListener("click", closeMobile);
		if (backdrop) backdrop.addEventListener("click", closeMobile);

		w.addEventListener("scroll", updateActiveByScroll, { passive: true });
		w.addEventListener("resize", function() {
			if (state.mobileOpen && w.innerWidth >= 1280) {
				closeMobile(false);
				var link = w.document.querySelector("#tocNavDesktop a");
				if (link) link.focus();
			}
			updateActiveByScroll();
		});
		w.document.addEventListener("keydown", function(e) {
			if (e.key === "Escape" && state.mobileOpen) {
				closeMobile();
			}
		});
		state.initialized = true;
	};

	var init = function() {
		var container = getArticleContainer();
		if (!container) {
			return;
		}

		if (w.SignalAyuHeadingAnchor) w.SignalAyuHeadingAnchor.init();
		var tree = buildEntries(container);
		if (!tree.length) {
			return;
		}

		var desktopWrap = byId("tocFloating");
		var mobileBtn = byId("tocMobileBtn");
		var desktopNav = byId("tocNavDesktop");
		var mobileNav = byId("tocNavMobile");
		if (!desktopWrap || !mobileBtn || !desktopNav || !mobileNav) {
			return;
		}

		var markup = renderList(tree);
		desktopNav.innerHTML = markup;
		mobileNav.innerHTML = markup;

		desktopWrap.hidden = false;
		mobileBtn.hidden = false;

		state.entries = flattenTree(tree);
		bindEvents();
		updateActiveByScroll();
		if (!state.hashAligned && w.location.hash) {
			state.hashAligned = true;
			try {
				var initialId = decodeURIComponent(w.location.hash.slice(1));
				w.requestAnimationFrame(function() { scrollToHeading(initialId, "auto"); });
			} catch (e) {} // A malformed external hash must not interrupt initialization.
		}
	};

	w.SignalAyuToc = {
		init: init
	};
})(window);

;(function(w) {
	var getArticleContainer = function() {
		return w.document.querySelector(".skin_view .area_view.article-view .tt_article_useless_p_margin")
			|| w.document.querySelector(".skin_view .area_view.article-view");
	};

	var slugify = function(text) {
		return (text || "")
			.toLowerCase()
			.trim()
			.replace(/[\s_./+|]+/g, "-")
			.replace(/[^a-z0-9가-힣-]/g, "")
			.replace(/-+/g, "-")
			.replace(/^-+|-+$/g, "") || "section";
	};

	var buildIdCountMap = function(scope) {
		var counts = Object.create(null);
		if (!scope) return counts;
		var nodes = scope.querySelectorAll("[id]");
		var i;
		for (i = 0; i < nodes.length; i++) {
			var id = nodes[i].id;
			if (!id) continue;
			counts[id] = (counts[id] || 0) + 1;
		}
		return counts;
	};

	var getHeadingText = function(h2) {
		var clone = h2.cloneNode(true);
		var anchors = clone.querySelectorAll(".heading-anchor");
		var i;
		for (i = 0; i < anchors.length; i++) {
			anchors[i].remove();
		}
		return (clone.textContent || "").trim();
	};

	var ensureId = function(h2, idCounts, assignedIds) {
		var existingId = (h2.id || "").trim();
		if (existingId && idCounts[existingId] === 1 && !assignedIds[existingId]) {
			assignedIds[existingId] = true;
			return existingId;
		}

		var base = slugify(getHeadingText(h2));
		var candidate = base;
		var n = 2;
		while (assignedIds[candidate] || idCounts[candidate]) {
			candidate = base + "-" + n;
			n++;
		}

		h2.id = candidate;
		assignedIds[candidate] = true;
		idCounts[candidate] = 1;
		return candidate;
	};

	var scrollToHeading = function(id, behavior) {
		var target = w.document.getElementById(id);
		if (!target) return;
		var head = w.document.querySelector(".area_head");
		var offset = (head ? head.offsetHeight : 0) + 12;
		var top = target.getBoundingClientRect().top + w.pageYOffset - offset;
		w.scrollTo({ top: top, behavior: behavior || "smooth" });
	};

	var onAnchorClick = function(e) {
		var link = e.target.closest(".heading-anchor");
		if (!link) return;
		var href = link.getAttribute("href") || "";
		if (href.charAt(0) !== "#") return;
		var id = href.slice(1);
		if (!id) return;

		e.preventDefault();
		scrollToHeading(id, "smooth");
		if (w.history && typeof w.history.replaceState === "function") {
			w.history.replaceState(null, "", "#" + encodeURIComponent(id));
		} else {
			w.location.hash = id;
		}
	};

	var init = function() {
		var container = getArticleContainer();
		if (!container) return;

		var headings = container.querySelectorAll("h2");
		if (!headings.length) return;

		var idCounts = buildIdCountMap(w.document);
		var assignedIds = Object.create(null);
		var i;
		for (i = 0; i < headings.length; i++) {
			var h2 = headings[i];
			var id = ensureId(h2, idCounts, assignedIds);
			if (!id) continue;
			var existingAnchor = h2.querySelector(".heading-anchor");
			if (existingAnchor) {
				existingAnchor.setAttribute("href", "#" + id);
				continue;
			}

			var a = w.document.createElement("a");
			a.className = "heading-anchor";
			a.href = "#" + id;
			a.setAttribute("aria-label", "Link to this section");
			a.textContent = "#";
			h2.appendChild(a);
		}

		if (!container.__signalAyuHeadingAnchorBound) {
			container.addEventListener("click", onAnchorClick);
			container.__signalAyuHeadingAnchorBound = true;
		}
	};

	w.SignalAyuHeadingAnchor = {
		init: init
	};

	if (w.document.readyState === "loading") {
		w.document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})(window);

;(function(w) {
	var DEFAULT_LABEL = "Copy";
	var COPIED_LABEL = "Copied";
	var FAILED_LABEL = "Failed";

	var setButtonState = function(btn, label, state) {
		if (!btn) return;
		btn.textContent = label;
		btn.setAttribute("aria-label", "Copy code to clipboard");
		btn.classList.remove("is-copied", "is-failed");
		if (state === "copied") {
			btn.classList.add("is-copied");
		} else if (state === "failed") {
			btn.classList.add("is-failed");
		}
	};

	var resetButtonStateLater = function(btn) {
		if (!btn) return;
		w.setTimeout(function() {
			setButtonState(btn, DEFAULT_LABEL, "default");
		}, 1400);
	};

	var fallbackCopy = function(text) {
		var ta = w.document.createElement("textarea");
		ta.value = text;
		ta.setAttribute("readonly", "");
		ta.style.position = "fixed";
		ta.style.top = "-1000px";
		ta.style.left = "-1000px";
		w.document.body.appendChild(ta);
		ta.select();
		var ok = false;
		try {
			ok = w.document.execCommand("copy");
		} catch (e) {
			ok = false;
		}
		w.document.body.removeChild(ta);
		return ok;
	};

	var copyText = function(text) {
		if (w.navigator.clipboard && typeof w.navigator.clipboard.writeText === "function") {
			return w.navigator.clipboard.writeText(text);
		}
		return new Promise(function(resolve, reject) {
			if (fallbackCopy(text)) resolve();
			else reject(new Error("fallback copy failed"));
		});
	};

	var getCodeText = function(pre) {
		var code = pre.querySelector("code");
		return (code ? code.textContent : pre.textContent) || "";
	};

	var detectRawLanguage = function(pre) {
		if (!pre) return "";
		var fromKe = (pre.getAttribute("data-ke-language") || "").trim().toLowerCase();
		if (fromKe) {
			return fromKe;
		}

		var code = pre.querySelector("code");
		if (!code) {
			return "";
		}

		var className = code.className || "";
		var m = className.match(/\blanguage-([a-z0-9_+-]+)\b/i);
		if (m && m[1]) {
			return m[1].toLowerCase();
		}
		m = className.match(/\blang-([a-z0-9_+-]+)\b/i);
		if (m && m[1]) {
			return m[1].toLowerCase();
		}
		return "";
	};

	var normalizeLanguageLabel = function(raw) {
		if (!raw) return "";
		var key = raw.toLowerCase();
		var map = {
			javascript: "JavaScript",
			js: "JS",
			css: "CSS",
			html: "HTML",
			bash: "Bash",
			shell: "Shell",
			json: "JSON",
			yaml: "YAML",
			yml: "YAML"
		};
		return map[key] || "";
	};

	var enhancePre = function(pre) {
		if (!pre || pre.__signalAyuCopyBound || pre.classList.contains("has-code-copy")) {
			return;
		}

		var text = getCodeText(pre);
		if (!text || !text.trim()) {
			return;
		}

		var parent = pre.parentNode;
		if (!parent) {
			return;
		}
		if (parent.classList && parent.classList.contains("ayu-code-wrap")) {
			return;
		}

		var wrapper = w.document.createElement("div");
		wrapper.className = "ayu-code-wrap";

		parent.insertBefore(wrapper, pre);
		wrapper.appendChild(pre);

		var meta = w.document.createElement("div");
		meta.className = "code-meta";
		wrapper.insertBefore(meta, pre);

		var label = normalizeLanguageLabel(detectRawLanguage(pre));
		if (label && !meta.querySelector(".code-lang")) {
			var lang = w.document.createElement("span");
			lang.className = "code-lang";
			lang.textContent = label;
			meta.appendChild(lang);
		}

		var btn = w.document.createElement("button");
		btn.type = "button";
		btn.className = "btn_code_copy";
		btn.setAttribute("aria-label", "Copy code to clipboard");
		setButtonState(btn, DEFAULT_LABEL, "default");
		meta.appendChild(btn);

		pre.classList.add("has-code-copy");

			btn.addEventListener("click", function() {
				copyText(getCodeText(pre)).then(function() {
					setButtonState(btn, COPIED_LABEL, "copied");
					resetButtonStateLater(btn);
				}).catch(function() {
					setButtonState(btn, FAILED_LABEL, "failed");
					resetButtonStateLater(btn);
				});
			});

		pre.__signalAyuCopyBound = true;
	};

	var init = function() {
		var article = w.document.querySelector(".article-view");
		if (!article) {
			return;
		}
		var blocks = article.querySelectorAll("pre");
		var i;
		for (i = 0; i < blocks.length; i++) {
			enhancePre(blocks[i]);
		}
	};

	var observeArticle = function() {
		var article = w.document.querySelector(".article-view");
		if (!article || article.__signalAyuCopyObserved) {
			return;
		}

		var observer = new MutationObserver(function(mutations) {
			var i;
			for (i = 0; i < mutations.length; i++) {
				var m = mutations[i];
				if (!m.addedNodes || !m.addedNodes.length) {
					continue;
				}
				var j;
				for (j = 0; j < m.addedNodes.length; j++) {
					var node = m.addedNodes[j];
					if (!node || node.nodeType !== 1) {
						continue;
					}
					if (node.tagName === "PRE") {
						enhancePre(node);
						continue;
					}
					if (node.querySelectorAll) {
						var pres = node.querySelectorAll("pre");
						var k;
						for (k = 0; k < pres.length; k++) {
							enhancePre(pres[k]);
						}
					}
				}
			}
		});

		observer.observe(article, { childList: true, subtree: true });
		article.__signalAyuCopyObserved = true;
		article.__signalAyuCopyObserver = observer;
	};

	var boot = function() {
		init();
		observeArticle();
		// Tistory/hljs post-processing safety pass
		w.setTimeout(init, 300);
		w.setTimeout(init, 1000);
	};

	w.SignalAyuCodeCopy = {
		init: init
	};

	if (w.document.readyState === "loading") {
		w.document.addEventListener("DOMContentLoaded", boot);
	} else {
		boot();
	}
})(window);

;(function(w, $) {
	if (!$) {
		return;
	}

	var Area = {};

	Area.Comment = (function() {
		var $btnOpen = $(".btn_reply"),
			$fieldReply = $(".fld_reply");

		var init = function() {
			if ($fieldReply.is(":visible")) {
				$btnOpen.addClass("on");
			}
		};

		return {
			init: init
		}
	})();

	Area.ReadingTime = (function() {
		var getSkinView = function() {
			return w.document.querySelector(".skin_view");
		};

		var isPostDetailView = function(skinView) {
			if (!skinView) {
				return false;
			}
			// In this skin, post permalink has category link href.
			// Notice/protected/page templates either miss href or article-view body.
			var categoryLink = skinView.querySelector(".area_title .tit_category a[href]");
			var articleView = skinView.querySelector(".area_view.article-view");
			return !!(categoryLink && articleView);
		};

		var getArticleTextContainer = function(skinView) {
			if (!skinView) {
				return null;
			}
			return skinView.querySelector(".area_view.article-view .tt_article_useless_p_margin")
				|| skinView.querySelector(".area_view.article-view");
		};

		var getMetaLine = function(skinView) {
			if (!skinView) {
				return null;
			}
			return skinView.querySelector(".area_title .txt_detail.my_post");
		};

		var estimateMinutes = function(text) {
			var normalized = (text || "").replace(/\s+/g, "");
			var chars = normalized.length;
			if (!chars) {
				return 0;
			}
			var minutes = Math.ceil(chars / 500);
			return minutes < 1 ? 1 : minutes;
		};

		var init = function() {
			var skinView = getSkinView();
			var articleTextContainer;
			var metaLine;
			var existing;
			var minutes;
			var text;
			var node;
			var editMenu;

			if (!isPostDetailView(skinView)) {
				return;
			}

			articleTextContainer = getArticleTextContainer(skinView);
			metaLine = getMetaLine(skinView);
			if (!articleTextContainer || !metaLine) {
				return;
			}

			existing = metaLine.querySelector(".reading_time");
			editMenu = metaLine.querySelector(".my_edit");

			text = articleTextContainer.textContent || "";
			minutes = estimateMinutes(text);
			if (minutes < 2) {
				return;
			}

			if (!existing) {
				node = w.document.createElement("span");
				node.className = "reading_time";
				node.textContent = " \u00b7 " + minutes + " min read";
				if (editMenu) {
					metaLine.insertBefore(node, editMenu);
				} else {
					metaLine.appendChild(node);
				}
				existing = node;
			}

			// Deterministically normalize final order:
			// author/date text -> .reading_time -> .my_edit
			if (existing && editMenu && (existing.compareDocumentPosition(editMenu) & Node.DOCUMENT_POSITION_PRECEDING)) {
				metaLine.insertBefore(existing, editMenu);
			}
		};

		return {
			init: init
		};
	})();

	Area.ReadingProgress = (function() {
		var barWrap;
		var barFill;
		var article;
		var ticking = false;
		var minScrollableRange = 280;

		var clamp = function(value, min, max) {
			return Math.max(min, Math.min(max, value));
		};

		var hide = function() {
			if (barWrap) {
				barWrap.classList.remove("is-active");
			}
			if (barFill) {
				barFill.style.width = "0%";
			}
		};

		var update = function() {
			ticking = false;
			if (!barWrap || !barFill || !article) {
				hide();
				return;
			}

			var rect = article.getBoundingClientRect();
			var viewportH = w.innerHeight || w.document.documentElement.clientHeight || 0;
			var articleTop = rect.top + w.pageYOffset;
			var articleHeight = Math.max(0, rect.height);
			var articleEnd = articleTop + articleHeight;
			var range = articleEnd - articleTop - viewportH;

			// Very short posts: keep hidden.
			if (range < minScrollableRange) {
				hide();
				return;
			}

			var y = w.pageYOffset || w.document.documentElement.scrollTop || 0;
			var raw = (y - articleTop) / range;
			var progress = clamp(raw, 0, 1);

			// Hide until reader meaningfully reaches article body.
			if (progress <= 0) {
				hide();
				return;
			}

			barWrap.classList.add("is-active");
			barFill.style.width = (progress * 100).toFixed(2) + "%";
		};

		var requestUpdate = function() {
			if (ticking) {
				return;
			}
			ticking = true;
			w.requestAnimationFrame(update);
		};

		var init = function() {
			barWrap = w.document.querySelector(".reading_progress");
			barFill = w.document.querySelector(".reading_progress_bar");
			article = w.document.querySelector(".skin_view .area_view.article-view");
			if (!barWrap || !barFill || !article) {
				return;
			}

			if (!barWrap.__signalAyuReadingProgressBound) {
				w.addEventListener("scroll", requestUpdate, { passive: true });
				w.addEventListener("resize", requestUpdate);
				barWrap.__signalAyuReadingProgressBound = true;
			}
			requestUpdate();
		};

		return {
			init: init
		};
	})();

	Area.init = function() {
		Area.Comment.init();
		Area.ReadingTime.init();
		Area.ReadingProgress.init();
		if (w.SignalAyuCodeCopy && typeof w.SignalAyuCodeCopy.init === "function" && w.document.querySelector(".article-view")) {
			w.SignalAyuCodeCopy.init();
		}
	};

	$.Area = Area;
})(window, window.jQuery);
