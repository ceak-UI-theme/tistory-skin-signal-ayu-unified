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
		var counts = {};
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
			w.history.replaceState(null, "", "#" + id);
		} else {
			w.location.hash = id;
		}
	};

	var init = function() {
		var container = getArticleContainer();
		if (!container) return;

		var headings = container.querySelectorAll("h2");
		if (!headings.length) return;

		var idCounts = buildIdCountMap(container);
		var assignedIds = {};
		var i;
		for (i = 0; i < headings.length; i++) {
			var h2 = headings[i];
			var id = ensureId(h2, idCounts, assignedIds);
			if (!id) continue;
			if (h2.querySelector(".heading-anchor")) continue;

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
		Area.Skin.init();
		Area.Profile.init();
		Area.Category.init();
		Area.Search.init();
		Area.Comment.init();
		Area.ReadingTime.init();
		Area.ReadingProgress.init();
		if (w.SignalAyuCodeCopy && typeof w.SignalAyuCodeCopy.init === "function" && w.document.querySelector(".article-view")) {
			w.SignalAyuCodeCopy.init();
		}
	};

	$.Area = Area;
})(window, window.jQuery);
