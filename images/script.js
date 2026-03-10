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
