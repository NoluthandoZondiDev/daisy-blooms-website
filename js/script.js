/* ==========================================================================
   script.js  |  Daisy Blooms Salon, Part 3
   One file for all of the site's JavaScript. It is loaded at the bottom of
   each page, so the HTML already exists when this code runs.

   Sections in this file:
     1. Lightbox       (index.html and gallery.html)
     2. Gallery filter (gallery.html)
   More sections (accordion, search, forms) are added in later steps.
   ========================================================================== */

// Wait until the page has finished loading, then start each feature.
// Each feature checks that its own elements exist, so one script can safely
// be shared by every page.
document.addEventListener("DOMContentLoaded", function () {
  initLightbox();
  initGalleryFilter();
});


/* ==========================================================================
   1. LIGHTBOX
   Any link with class "lightbox-link" inside an element marked
   data-lightbox-group opens its image in a full-screen pop-up viewer with
   previous/next buttons, keyboard arrows, swipe, and a close button.
   The viewer itself is created here with JavaScript (DOM manipulation), so
   the HTML pages stay clean.
   ========================================================================== */
function initLightbox() {
  var groups = document.querySelectorAll("[data-lightbox-group]");
  if (groups.length === 0) {
    return; // This page has no gallery, so there is nothing to do.
  }

  // --- Build the pop-up viewer once and add it to the page ---
  var overlay = document.createElement("div");
  overlay.className = "lightbox";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Photo viewer");
  overlay.hidden = true; // hidden until a photo is clicked

  overlay.innerHTML =
    '<button type="button" class="lightbox-close" aria-label="Close photo viewer">&times;</button>' +
    '<button type="button" class="lightbox-prev" aria-label="Previous photo">&#10094;</button>' +
    '<figure class="lightbox-figure">' +
      '<img class="lightbox-img" src="" alt="">' +
      '<figcaption class="lightbox-caption"></figcaption>' +
    '</figure>' +
    '<button type="button" class="lightbox-next" aria-label="Next photo">&#10095;</button>' +
    '<p class="lightbox-counter" aria-live="polite"></p>';

  document.body.appendChild(overlay);

  // Grab the parts of the viewer we need to update
  var figure   = overlay.querySelector(".lightbox-figure");
  var bigImg   = overlay.querySelector(".lightbox-img");
  var caption  = overlay.querySelector(".lightbox-caption");
  var counter  = overlay.querySelector(".lightbox-counter");
  var btnClose = overlay.querySelector(".lightbox-close");
  var btnPrev  = overlay.querySelector(".lightbox-prev");
  var btnNext  = overlay.querySelector(".lightbox-next");

  // --- State: which photos can be browsed, and which one is showing ---
  var links = [];            // the links that are currently visible in the group
  var index = 0;             // position of the photo being shown
  var lastFocused = null;    // the link that opened the viewer (focus returns here)

  // Show the photo at position i
  function showPhoto(i) {
    index = i;
    var link = links[index];
    var thumb = link.querySelector("img");

    figure.classList.add("is-loading");          // dim the old picture
    bigImg.onload = function () {
      figure.classList.remove("is-loading");     // new picture is ready
    };
    bigImg.src = link.getAttribute("href");      // large version of the photo
    bigImg.alt = thumb ? thumb.alt : "";

    // The caption uses the photo's alt text so screen readers and sighted
    // visitors get the same description.
    caption.textContent = thumb ? thumb.alt : "";
    counter.textContent = (index + 1) + " / " + links.length;

    // Hide the arrows when there is only one photo to look at
    btnPrev.hidden = links.length < 2;
    btnNext.hidden = links.length < 2;

    // Start loading the neighbouring photos so next/previous feels instant
    preload(index + 1);
    preload(index - 1);
  }

  function preload(i) {
    if (links.length < 2) return;
    var wrapped = (i + links.length) % links.length;
    new Image().src = links[wrapped].getAttribute("href");
  }

  function showNext() { showPhoto((index + 1) % links.length); }
  function showPrev() { showPhoto((index - 1 + links.length) % links.length); }

  // Open the viewer on a chosen link
  function openViewer(group, clickedLink) {
    // Only browse photos that are not hidden by the gallery filter
    links = Array.prototype.filter.call(
      group.querySelectorAll("a.lightbox-link"),
      function (a) { return a.closest("[hidden]") === null; }
    );

    lastFocused = clickedLink;
    showPhoto(links.indexOf(clickedLink));

    overlay.hidden = false;
    document.body.classList.add("lightbox-open");
    // Wait one frame so the fade-in transition can play
    requestAnimationFrame(function () {
      overlay.classList.add("is-open");
      btnClose.focus(); // keyboard and screen reader users start on the close button
    });
  }

  // Close the viewer
  function closeViewer() {
    overlay.classList.remove("is-open");
    document.body.classList.remove("lightbox-open");
    // Wait for the fade-out to finish before hiding it completely
    setTimeout(function () {
      overlay.hidden = true;
      bigImg.src = "";
    }, 250);
    if (lastFocused) {
      lastFocused.focus(); // put the keyboard focus back where it was
    }
  }

  // --- Clicking a photo in any gallery group opens the viewer ---
  // One listener per group handles every photo inside it (event delegation).
  groups.forEach(function (group) {
    group.addEventListener("click", function (event) {
      var link = event.target.closest("a.lightbox-link");
      if (!link) return;
      event.preventDefault();      // stop the browser opening the plain image
      openViewer(group, link);
    });
  });

  // --- Buttons ---
  btnClose.addEventListener("click", closeViewer);
  btnNext.addEventListener("click", showNext);
  btnPrev.addEventListener("click", showPrev);

  // Clicking the dark area around the photo also closes the viewer
  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) closeViewer();
  });

  // --- Keyboard: Escape closes, arrows move, Tab stays inside the viewer ---
  document.addEventListener("keydown", function (event) {
    if (overlay.hidden) return;

    if (event.key === "Escape")     { closeViewer(); }
    if (event.key === "ArrowRight") { showNext(); }
    if (event.key === "ArrowLeft")  { showPrev(); }

    if (event.key === "Tab") {
      // Keep Tab cycling between the viewer's own buttons
      var buttons = [btnClose, btnPrev, btnNext].filter(function (b) { return !b.hidden; });
      var first = buttons[0];
      var last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  // --- Touch: swipe left or right on a phone to change photo ---
  var touchStartX = null;
  overlay.addEventListener("touchstart", function (event) {
    touchStartX = event.changedTouches[0].clientX;
  }, { passive: true });
  overlay.addEventListener("touchend", function (event) {
    if (touchStartX === null) return;
    var distance = event.changedTouches[0].clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(distance) > 50) {      // ignore tiny movements (taps)
      if (distance < 0) { showNext(); } else { showPrev(); }
    }
  }, { passive: true });
}


/* ==========================================================================
   2. GALLERY FILTER
   The buttons above the gallery show only the photos for one service.
   Each photo carries a data-category (haircuts, styling, colouring, beauty).
   Photos fade out and in using the CSS class "is-fading".
   ========================================================================== */
function initGalleryFilter() {
  var bar = document.querySelector(".filter-bar");
  if (!bar) {
    return; // Not the gallery page.
  }

  var buttons = bar.querySelectorAll("button[data-filter]");
  var items = document.querySelectorAll(".gallery-item");
  var countText = document.getElementById("gallery-count");

  // Friendly names for the message under the buttons
  var labels = {
    haircuts: "haircut",
    styling: "styling",
    colouring: "colouring",
    beauty: "beauty treatment"
  };

  function showItem(item) {
    if (item.hidden) {
      item.hidden = false;                 // put it back in the layout
      item.classList.add("is-fading");     // start transparent...
      void item.offsetWidth;               // ...force the browser to notice...
    }
    item.classList.remove("is-fading");    // ...then fade in
  }

  function hideItem(item) {
    if (item.hidden) return;
    item.classList.add("is-fading");       // fade out first
    setTimeout(function () {
      // Only hide it if it is still fading (the visitor may have changed filter)
      if (item.classList.contains("is-fading")) {
        item.hidden = true;
      }
    }, 300);                               // matches the 0.3s CSS transition
  }

  function applyFilter(filter) {
    // Update which button looks switched on
    buttons.forEach(function (button) {
      button.setAttribute("aria-pressed", button.dataset.filter === filter ? "true" : "false");
    });

    // Show the matching photos and hide the rest
    var shown = 0;
    items.forEach(function (item) {
      var matches = filter === "all" || item.dataset.category === filter;
      if (matches) {
        shown++;
        showItem(item);
      } else {
        hideItem(item);
      }
    });

    // Give the visitor immediate feedback about what they are seeing
    if (filter === "all") {
      countText.textContent = "Showing all " + shown + " photos";
    } else {
      countText.textContent = "Showing " + shown + " " + labels[filter] + " photos";
    }
  }

  // One listener on the bar handles all the buttons (event delegation)
  bar.addEventListener("click", function (event) {
    var button = event.target.closest("button[data-filter]");
    if (button) {
      applyFilter(button.dataset.filter);
    }
  });
}
