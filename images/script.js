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
		mobileOpen: false
	};

	var byId = function(id) {
		return w.document.getElementById(id);
	};

	var isPermalinkContext = function() {
		var body = w.document.body;
		if (!body) {
			return false;
		}

		// Tistory detail page guard: list/home pages usually keep this as null.
		if (!w.T || !w.T.entryInfo) {
			return false;
		}

		var bodyId = (body.id || "").toLowerCase();
		var listLikeTokens = ["index", "category", "tag", "search", "archive", "guestbook"];
		var i;

		for (i = 0; i < listLikeTokens.length; i++) {
			if (bodyId.indexOf(listLikeTokens[i]) >= 0) {
				return false;
			}
		}

		var detailLike = bodyId.indexOf("entry") >= 0 || bodyId.indexOf("page") >= 0 || bodyId.indexOf("notice") >= 0;
		if (!detailLike) {
			return false;
		}

		var skins = w.document.querySelectorAll(".skin_view .area_view.article-view");
		if (skins.length !== 1) {
			return false;
		}

		var titleLink = w.document.querySelector(".skin_view .area_title .tit_post a");
		return !!titleLink;
	};

	var getArticleContainer = function() {
		if (!isPermalinkContext()) {
			return null;
		}
		return w.document.querySelector(".skin_view .area_view.article-view");
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
		if (el.id) {
			usedIds[el.id] = true;
			return el.id;
		}
		var base = slugify(el.textContent);
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

	var buildEntries = function(container) {
		var hasH1 = !!container.querySelector("h1");
		var topTag = hasH1 ? "H1" : "H2";
		var childTag = hasH1 ? "H2" : "H3";
		var usedIds = {};
		var raw = [];
		var nodes = container.querySelectorAll("h1, h2, h3");
		var i;

		for (i = 0; i < nodes.length; i++) {
			var el = nodes[i];
			var tag = el.tagName;
			if (tag !== topTag && tag !== childTag) {
				continue;
			}
			var text = (el.textContent || "").trim();
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
			if (item.tag === topTag) {
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

		var flat = [];
		for (i = 0; i < nested.length; i++) {
			flat.push(nested[i]);
			var j;
			for (j = 0; j < nested[i].children.length; j++) {
				flat.push(nested[i].children[j]);
			}
		}

		return flat.length >= 2 ? nested : [];
	};

	var renderList = function(tree) {
		var html = ['<ul class="toc-list">'];
		var i;
		for (i = 0; i < tree.length; i++) {
			var top = tree[i];
			html.push('<li class="toc-item toc-item-l1"><a class="toc-link toc-link-l1" href="#' + top.id + '" data-target="' + top.id + '">' + top.text + "</a>");
			if (top.children && top.children.length) {
				html.push('<ul class="toc-sublist">');
				var j;
				for (j = 0; j < top.children.length; j++) {
					var child = top.children[j];
					html.push('<li class="toc-item toc-item-l2"><a class="toc-link toc-link-l2" href="#' + child.id + '" data-target="' + child.id + '">' + child.text + "</a></li>");
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

	var scrollToHeading = function(id) {
		var target = byId(id);
		if (!target) {
			return;
		}
		updateHeaderOffset();
		var top = target.getBoundingClientRect().top + w.pageYOffset - state.headerOffset;
		w.scrollTo({ top: top, behavior: "smooth" });
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

	var closeMobile = function() {
		var panel = byId("tocMobilePanel");
		var backdrop = byId("tocMobileBackdrop");
		var btn = byId("tocMobileBtn");
		state.mobileOpen = false;
		if (panel) panel.hidden = true;
		if (backdrop) backdrop.hidden = true;
		if (btn) btn.setAttribute("aria-expanded", "false");
	};

	var openMobile = function() {
		var panel = byId("tocMobilePanel");
		var backdrop = byId("tocMobileBackdrop");
		var btn = byId("tocMobileBtn");
		state.mobileOpen = true;
		if (panel) panel.hidden = false;
		if (backdrop) backdrop.hidden = false;
		if (btn) btn.setAttribute("aria-expanded", "true");
	};

	var bindEvents = function() {
		var clickHandler = function(e) {
			var link = e.target.closest(".toc-link");
			if (!link) return;
			e.preventDefault();
			var id = link.getAttribute("data-target");
			scrollToHeading(id);
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
		w.addEventListener("resize", updateActiveByScroll);
		w.document.addEventListener("keydown", function(e) {
			if (e.key === "Escape" && state.mobileOpen) {
				closeMobile();
			}
		});
	};

	var init = function() {
		var container = getArticleContainer();
		if (!container) {
			return;
		}

		var tree = buildEntries(container);
		if (tree.length < 2) {
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
	};

	w.SignalAyuToc = {
		init: init
	};
})(window);

;(function(w, $) {
	if (!$) {
		return;
	}

	var Area = {};

	Area.Skin = (function() {
		var $body = $(document.body),
			$areaSkin = $(".wrap_skin");

		var openMenu = function() {
			$body.addClass("layer_on");
		};

		var closeMenu = function() {
			$body.removeClass("layer_on");
		};

		var init = function() {
			$areaSkin.on("click", ".btn_menu", openMenu);
			$areaSkin.on("click", ".btn_close, .dimmed_layer", closeMenu);
			$(document).on("keydown", function(e) {
				if (e.key === "Escape") {
					closeMenu();
				}
			});
		};

		return {
			init: init
		}
	})();

	Area.Profile = (function() {
		var $areaProfile = $(".area_profile");

		var toggleProfileMenu = function() {
			$areaProfile.toggleClass("on");
		};

		var init = function() {
			$areaProfile.on("click", ".btn_name", toggleProfileMenu);
		};

		return {
			init: init
		}
	})();

	Area.Category = (function() {
		var $areaNavi = $(".area_navi");

		var toggleCategory = function() {
			$areaNavi.toggleClass("on");
		};

		var init = function() {
			$areaNavi.on("click", ".btn_cate", toggleCategory);
		};

		return {
			init: init
		}
	})();


	Area.Search = (function() {
		var $areaSearch = $(".area_search"),
			$input = $areaSearch.find(".tf_search");

		var openSearch = function() {
			$areaSearch.addClass("on");
			$input.focus();
		};

		var leaveSearch = function() {
			if ($input.val() == "") {
				$areaSearch.removeClass("on");
			}
		};

		var init = function() {
			$areaSearch.on("click", ".btn_search", openSearch);
			$input.on("blur", leaveSearch);
		};

		return {
			init: init
		}
	})();

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

	Area.init = function() {
		Area.Skin.init();
		Area.Profile.init();
		Area.Category.init();
		Area.Search.init();
		Area.Comment.init();
	};

	$.Area = Area;
})(window, window.jQuery);
