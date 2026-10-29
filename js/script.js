/* ==========================================================================
   script.js  |  Daisy Blooms Salon, Part 3
   One file for all of the site's JavaScript. It is loaded at the bottom of
   each page, so the HTML already exists when this code runs.

   Sections in this file:
     1. Lightbox         (index.html and gallery.html)
     2. Gallery filter   (gallery.html)
     3. Services page    (services.html): accordion, search, sort, summary
     4. Enquiry form     (enquiry.html): validation and an instant response
   More sections (contact form and map) are added in later steps.
   ========================================================================== */

// Wait until the page has finished loading, then start each feature.
// Each feature checks that its own elements exist, so one script can safely
// be shared by every page.
document.addEventListener("DOMContentLoaded", function () {
  initLightbox();
  initGalleryFilter();
  initServicesPage();
  initEnquiryForm();
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


/* ==========================================================================
   3. SERVICES PAGE: accordion, search, sort and live summary
   - Accordion: each service group opens and closes with its heading button.
   - Search:    typing filters the price rows as you type.
   - Sort:      reorders the rows inside every table by price.
   - Summary:   a line of text that is rebuilt from the visible rows.
   The tables are plain HTML, so the page still works without JavaScript.
   ========================================================================== */
function initServicesPage() {
  var searchBox = document.getElementById("service-search");
  if (!searchBox) {
    return; // Not the services page.
  }

  var sortMenu   = document.getElementById("service-sort");
  var summary    = document.getElementById("services-summary");
  var emptyNote  = document.getElementById("services-empty");
  var groups     = document.querySelectorAll(".service-group");
  var triggers   = document.querySelectorAll(".accordion-trigger");

  // Remember each row's starting position, so "Default order" can restore it
  groups.forEach(function (group) {
    group.querySelectorAll("tbody tr").forEach(function (row, position) {
      row.dataset.order = position;
    });
  });

  // ---------- Accordion ----------
  // Open or close one group. The aria-expanded value tells assistive
  // technology the state; the CSS class animates the panel.
  function setGroupOpen(trigger, open) {
    var panel = document.getElementById(trigger.getAttribute("aria-controls"));
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    panel.classList.toggle("is-collapsed", !open);
  }

  triggers.forEach(function (trigger) {
    trigger.addEventListener("click", function () {
      var isOpen = trigger.getAttribute("aria-expanded") === "true";
      setGroupOpen(trigger, !isOpen);
    });
  });

  document.getElementById("expand-all").addEventListener("click", function () {
    triggers.forEach(function (trigger) { setGroupOpen(trigger, true); });
  });

  document.getElementById("collapse-all").addEventListener("click", function () {
    triggers.forEach(function (trigger) { setGroupOpen(trigger, false); });
  });

  // ---------- Search ----------
  // Turn a price cell such as "R1,200" into the number 1200
  function priceOf(row) {
    return parseInt(row.cells[1].textContent.replace(/[^0-9]/g, ""), 10);
  }

  // Format a number back into rand with a comma, e.g. 1200 -> "R1,200"
  function rand(amount) {
    return "R" + String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function applySearch() {
    var query = searchBox.value.trim().toLowerCase();
    var visiblePrices = [];

    groups.forEach(function (group) {
      var matches = 0;

      group.querySelectorAll("tbody tr").forEach(function (row) {
        var name = row.cells[0].textContent.toLowerCase();
        // A row matches if the search box is empty or its text appears in the service name
        var show = query === "" || name.indexOf(query) !== -1;
        row.hidden = !show;
        if (show) {
          matches++;
          visiblePrices.push(priceOf(row));
        }
      });

      // Hide a whole group when none of its rows match
      group.hidden = matches === 0;

      // While searching, open any group that has matches so results are visible
      if (query !== "" && matches > 0) {
        setGroupOpen(group.querySelector(".accordion-trigger"), true);
      }
    });

    updateSummary(query, visiblePrices);
  }

  // Rebuild the sentence under the tools from the rows currently showing.
  // textContent is used (never innerHTML), so whatever a visitor types can
  // never be run as code.
  function updateSummary(query, prices) {
    if (prices.length === 0) {
      summary.textContent = "";
      emptyNote.textContent = "No services match \u201C" + query + "\u201D. Try a word like cut, braid, colour or brow.";
      emptyNote.hidden = false;
      return;
    }

    emptyNote.hidden = true;
    var lowest  = Math.min.apply(null, prices);
    var highest = Math.max.apply(null, prices);
    var label = prices.length === 1 ? "service" : "services";

    summary.textContent = (query === "" ? "Showing all " : "Showing ") +
      prices.length + " " + label +
      (prices.length > 1 ? ", with prices from " + rand(lowest) + " to " + rand(highest) : ", priced at " + rand(lowest)) + ".";
  }

  searchBox.addEventListener("input", applySearch);

  // Pressing Escape in the search box clears it
  searchBox.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      searchBox.value = "";
      applySearch();
    }
  });

  // ---------- Sort ----------
  // Reorder the rows inside every table. Appending a row that is already
  // in the table simply moves it, so no rows are copied or lost.
  function applySort() {
    var mode = sortMenu.value;

    groups.forEach(function (group) {
      var body = group.querySelector("tbody");
      var rows = Array.prototype.slice.call(body.querySelectorAll("tr"));

      rows.sort(function (a, b) {
        if (mode === "low")  { return priceOf(a) - priceOf(b); }
        if (mode === "high") { return priceOf(b) - priceOf(a); }
        return a.dataset.order - b.dataset.order;   // default: original order
      });

      rows.forEach(function (row) { body.appendChild(row); });
    });
  }

  sortMenu.addEventListener("change", applySort);

  // Fill in the summary line when the page first loads
  applySearch();
}


/* ==========================================================================
   4. ENQUIRY FORM
   What it does:
     1. Builds the "Specific Service" menu from the service type chosen.
     2. Types the date as dd/mm/yyyy (adds the slashes automatically).
     3. Builds the "Preferred Time" menu from the opening hours and how long
        the chosen service takes.
     4. Checks every field and shows a clear message next to any problem.
     5. When everything is valid, works out a price estimate and shows a
        response on the page without reloading it.
   There is no server: the response is worked out in the browser from the
   data below. Keep these prices in step with the table on services.html.
   ========================================================================== */

// ---- Salon data used by the enquiry form ----
// Opening hours in 24-hour time. Sunday is closed, so it has no entry.
var OPENING_HOURS = {
  weekday:  { open: 9, close: 18, text: "Mon - Fri 09:00 - 18:00" },
  saturday: { open: 8, close: 16, text: "Sat 08:00 - 16:00" }
};

var BRANCHES = {
  rosebank: { name: "Rosebank", address: "15 Baker Street, Rosebank, Johannesburg, 2196", phone: "011 447 2200" },
  melville: { name: "Melville", address: "7th Street, Melville, Johannesburg, 2109",     phone: "011 482 3355" }
};

// Each service type holds its services: price in rand, minutes it takes,
// an optional note and, for "from" prices, from: true.
var ENQUIRY_SERVICES = {
  "haircut": {
    label: "Haircut",
    items: [
      { id: "womens-cut",    name: "Women's Cut & Trim",         price: 280, minutes: 60 },
      { id: "mens-cut",      name: "Men's Cut",                  price: 150, minutes: 30 },
      { id: "childrens-cut", name: "Children's Cut (under 12)",  price: 100, minutes: 30 },
      { id: "fringe-trim",   name: "Fringe / Trim Only",         price: 80,  minutes: 30 }
    ]
  },
  "styling": {
    label: "Styling",
    items: [
      { id: "blow-out",       name: "Blow-out",               price: 220, minutes: 60 },
      { id: "braiding-short", name: "Braiding (short)",       price: 350, minutes: 120,
        note: "Please arrive with clean, detangled hair." },
      { id: "braiding-long",  name: "Braiding (long)",        price: 550, minutes: 240,
        note: "Please arrive with clean, detangled hair." },
      { id: "updo",           name: "Special Occasion Updo",  price: 450, minutes: 90 }
    ]
  },
  "colouring": {
    label: "Colouring",
    items: [
      { id: "full-colour",     name: "Full Colour",             price: 650,  minutes: 120,
        note: "A patch test is recommended 48 hours before your first colour service." },
      { id: "balayage",        name: "Balayage",                price: 950,  minutes: 180,
        note: "A patch test is recommended 48 hours before your first colour service." },
      { id: "creative-colour", name: "Creative Colour",         price: 1200, minutes: 180, from: true,
        note: "Your final price is confirmed after a short consultation." },
      { id: "root-touch-up",   name: "Root Touch-Up",           price: 400,  minutes: 90,
        note: "A patch test is recommended 48 hours before your first colour service." }
    ]
  },
  "beauty-treatment": {
    label: "Beauty Treatment",
    items: [
      { id: "deep-conditioning", name: "Deep Conditioning Treatment", price: 180, minutes: 45 },
      { id: "scalp-treatment",   name: "Scalp Treatment",             price: 200, minutes: 45 },
      { id: "brow-shaping",      name: "Brow Shaping",                price: 90,  minutes: 30 },
      { id: "brow-tint",         name: "Brow Tint",                   price: 120, minutes: 30,
        note: "A patch test is recommended 48 hours before a brow tint." }
    ]
  }
};

var DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
var MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July",
                   "August", "September", "October", "November", "December"];

// ---- Small helpers ----
function pad2(number) { return (number < 10 ? "0" : "") + number; }

// 570 minutes after midnight -> "09:30"
function formatClock(totalMinutes) {
  return pad2(Math.floor(totalMinutes / 60)) + ":" + pad2(totalMinutes % 60);
}

// 1200 -> "R1,200"
function formatRand(amount) {
  return "R" + String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// 90 -> "1 hour 30 minutes"
function formatDuration(minutes) {
  var h = Math.floor(minutes / 60);
  var m = minutes % 60;
  var parts = [];
  if (h > 0) { parts.push(h + (h === 1 ? " hour" : " hours")); }
  if (m > 0) { parts.push(m + " minutes"); }
  return parts.join(" ");
}

// Find a service by its type key and id
function findService(typeKey, itemId) {
  var type = ENQUIRY_SERVICES[typeKey];
  if (!type) { return null; }
  for (var i = 0; i < type.items.length; i++) {
    if (type.items[i].id === itemId) { return type.items[i]; }
  }
  return null;
}

// Opening hours for a date (a JavaScript Date). Returns null on Sundays.
function hoursFor(dateObj) {
  var day = dateObj.getDay();           // 0 = Sunday ... 6 = Saturday
  if (day === 0) { return null; }
  return day === 6 ? OPENING_HOURS.saturday : OPENING_HOURS.weekday;
}

// All start times (in minutes after midnight) when a service still ends
// before closing time, every 30 minutes.
function startTimesFor(dateObj, serviceMinutes) {
  var hours = hoursFor(dateObj);
  var times = [];
  if (!hours) { return times; }
  for (var t = hours.open * 60; t + serviceMinutes <= hours.close * 60; t += 30) {
    times.push(t);
  }
  return times;
}

// Turn "dd/mm/yyyy" text into a real date, or explain what is wrong.
// Returns { date: Date } when fine, or { error: "message" } when not.
function parseEnquiryDate(text) {
  var value = text.trim();
  if (value === "") {
    return { error: "Please enter your preferred date." };
  }

  var match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) {
    return { error: "Please use the format dd/mm/yyyy, for example 14/11/2026." };
  }

  var day = parseInt(match[1], 10);
  var month = parseInt(match[2], 10);
  var year = parseInt(match[3], 10);
  var date = new Date(year, month - 1, day);

  // JavaScript quietly rolls 31/02 over into March, so check it did not
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return { error: "That date does not exist. Please check the day and month." };
  }

  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  var limit = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 180);

  if (date < tomorrow) {
    return { error: "Please choose a date from tomorrow onwards." };
  }
  if (date > limit) {
    return { error: "We can only take enquiries up to 6 months ahead." };
  }
  if (date.getDay() === 0) {
    return { error: "We are closed on Sundays. Please choose Monday to Saturday." };
  }
  return { date: date };
}

// Tidy a South African phone number. Accepts spaces, dashes and +27.
// Returns the 10 digits (for example "0821234567") or "" when invalid.
function cleanPhone(text) {
  var digits = text.replace(/[\s\-()]/g, "");
  if (/^\+27\d{9}$/.test(digits)) { digits = "0" + digits.slice(3); }
  return /^0\d{9}$/.test(digits) ? digits : "";
}

// "0821234567" -> "082 123 4567"
function showPhone(tenDigits) {
  return tenDigits.slice(0, 3) + " " + tenDigits.slice(3, 6) + " " + tenDigits.slice(6);
}

// Create an element with optional class and text. textContent (not
// innerHTML) is used so that anything a visitor typed can never be run as code.
function makeEl(tag, className, text) {
  var node = document.createElement(tag);
  if (className) { node.className = className; }
  if (text !== undefined) { node.textContent = text; }
  return node;
}


function initEnquiryForm() {
  var form = document.getElementById("enquiry-form");
  if (!form) {
    return; // Not the enquiry page.
  }

  // Switch off the browser's own pop-up messages: ours are clearer.
  // (Done here, not in the HTML, so the basic checks still work if
  // JavaScript fails to load.)
  form.noValidate = true;

  var nameBox    = document.getElementById("enquiry-name");
  var emailBox   = document.getElementById("enquiry-email");
  var phoneBox   = document.getElementById("enquiry-phone");
  var branchMenu = document.getElementById("enquiry-branch");
  var typeMenu   = document.getElementById("enquiry-service");
  var itemMenu   = document.getElementById("enquiry-item");
  var dateBox    = document.getElementById("enquiry-date");
  var timeMenu   = document.getElementById("enquiry-time");
  var detailsBox = document.getElementById("enquiry-details");
  var consentBox = document.getElementById("enquiry-consent");
  var contactSet = document.getElementById("enquiry-contact");
  var counter    = document.getElementById("enquiry-details-count");
  var summary    = document.getElementById("enquiry-summary");
  var response   = document.getElementById("enquiry-response");
  var submitBtn  = document.getElementById("enquiry-submit");

  // ---------- Dependent menus ----------

  // Fill the "Specific Service" menu for the chosen service type
  function fillItems(typeKey) {
    itemMenu.innerHTML = "";               // empty it (no visitor text is used here)
    var type = ENQUIRY_SERVICES[typeKey];

    if (!type) {
      itemMenu.appendChild(new Option("-- Choose a service type first --", ""));
      itemMenu.disabled = true;
      return;
    }

    itemMenu.appendChild(new Option("-- Select a " + type.label.toLowerCase() + " --", ""));
    type.items.forEach(function (item) {
      var label = item.name + " - " + (item.from ? "from " : "") + formatRand(item.price);
      itemMenu.appendChild(new Option(label, item.id));
    });
    itemMenu.disabled = false;
  }

  // Fill the "Preferred Time" menu when the service and date are both valid
  function fillTimes() {
    var service = findService(typeMenu.value, itemMenu.value);
    var parsed = parseEnquiryDate(dateBox.value);
    var previous = timeMenu.value;

    timeMenu.innerHTML = "";

    if (!service || !parsed.date) {
      timeMenu.appendChild(new Option("-- Choose a service and date first --", ""));
      timeMenu.disabled = true;
      return;
    }

    timeMenu.appendChild(new Option("-- Select a time --", ""));
    startTimesFor(parsed.date, service.minutes).forEach(function (minutes) {
      var endMinutes = minutes + service.minutes;
      timeMenu.appendChild(new Option(formatClock(minutes) + " (finishes about " + formatClock(endMinutes) + ")", formatClock(minutes)));
    });
    timeMenu.disabled = false;

    // Keep the visitor's earlier choice if it is still possible
    timeMenu.value = previous;
    if (timeMenu.value !== previous) { timeMenu.value = ""; }
  }

  // ---------- Checking each field ----------
  // Each checker returns an error message, or "" when the field is fine.

  var checks = {
    "enquiry-name": function () {
      var value = nameBox.value.trim();
      if (value === "") { return "Please enter your full name."; }
      if (!/^[\p{L}][\p{L}' -]{1,59}$/u.test(value)) {
        return "Please use letters only (2 to 60 characters). Spaces, hyphens and apostrophes are fine.";
      }
      return "";
    },

    "enquiry-email": function () {
      var value = emailBox.value.trim();
      if (value === "") { return "Please enter your email address."; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        return "That email does not look right. It should look like name@example.com.";
      }
      return "";
    },

    "enquiry-phone": function () {
      var value = phoneBox.value.trim();
      if (value === "") { return "Please enter your phone number."; }
      if (cleanPhone(value) === "") {
        return "Please enter a 10-digit South African number starting with 0, for example 0821234567.";
      }
      return "";
    },

    "enquiry-contact": function () {
      if (!contactSet.querySelector("input:checked")) {
        return "Please choose how you would like us to reply.";
      }
      return "";
    },

    "enquiry-branch": function () {
      return branchMenu.value === "" ? "Please choose a branch." : "";
    },

    "enquiry-service": function () {
      return typeMenu.value === "" ? "Please choose a service type." : "";
    },

    "enquiry-item": function () {
      if (typeMenu.value === "") { return "Please choose a service type first."; }
      return itemMenu.value === "" ? "Please choose the specific service you want." : "";
    },

    "enquiry-date": function () {
      return parseEnquiryDate(dateBox.value).error || "";
    },

    "enquiry-time": function () {
      if (timeMenu.disabled) { return "Please choose a service and a valid date first, then pick a time."; }
      return timeMenu.value === "" ? "Please choose a time." : "";
    },

    "enquiry-details": function () {
      return detailsBox.value.length > 300 ? "Please keep your message to 300 characters or fewer." : "";
    },

    "enquiry-consent": function () {
      return consentBox.checked ? "" : "Please tick the box so we are allowed to contact you.";
    }
  };

  var fieldIds = Object.keys(checks);

  // The element that holds the red error styling and the one to focus
  function groupOf(id) { return document.getElementById(id).closest(".form-group") || document.getElementById(id); }
  function focusTargetOf(id) {
    return id === "enquiry-contact" ? contactSet.querySelector("input") : document.getElementById(id);
  }

  // Show or clear the message for one field. Returns true when the field is valid.
  function validateField(id) {
    var message = checks[id]();
    var errorLine = document.getElementById(id + "-error");
    var group = groupOf(id);
    var control = focusTargetOf(id);

    errorLine.textContent = message;
    group.classList.toggle("has-error", message !== "");
    if (id !== "enquiry-contact") {
      control.setAttribute("aria-invalid", message !== "" ? "true" : "false");
    }
    return message === "";
  }

  // ---------- Live behaviour while the visitor fills in the form ----------

  // Type the date as dd/mm/yyyy: only digits, slashes added automatically
  dateBox.addEventListener("input", function () {
    var digits = dateBox.value.replace(/\D/g, "").slice(0, 8);
    var shown = digits;
    if (digits.length > 4) {
      shown = digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4);
    } else if (digits.length > 2) {
      shown = digits.slice(0, 2) + "/" + digits.slice(2);
    }
    dateBox.value = shown;
    fillTimes();
    if (document.getElementById("enquiry-date-error").textContent !== "") { validateField("enquiry-date"); }
  });

  typeMenu.addEventListener("change", function () {
    fillItems(typeMenu.value);
    fillTimes();
    validateField("enquiry-service");
    if (document.getElementById("enquiry-item-error").textContent !== "") { validateField("enquiry-item"); }
  });

  itemMenu.addEventListener("change", function () {
    fillTimes();
    validateField("enquiry-item");
  });

  // Character counter under the message box
  detailsBox.addEventListener("input", function () {
    counter.textContent = detailsBox.value.length + " / 300";
  });

  // Check a field when the visitor leaves it (blur), and re-check it as they
  // type once it has shown an error, so the message disappears as soon as
  // the problem is fixed.
  fieldIds.forEach(function (id) {
    var target = id === "enquiry-contact" ? contactSet : document.getElementById(id);

    target.addEventListener("blur", function () {
      // Do not nag about empty fields the visitor has only tabbed through
      if (id === "enquiry-contact") { return; }
      var isEmpty = (target.value === "" || target.type === "checkbox");
      if (!isEmpty) { validateField(id); }
    }, true);

    target.addEventListener("input", function () {
      if (document.getElementById(id + "-error").textContent !== "") { validateField(id); }
    });

    target.addEventListener("change", function () {
      if (id === "enquiry-service" || id === "enquiry-item") { return; } // handled above
      if (id === "enquiry-date") { return; }
      validateField(id);
    });
  });

  // ---------- Sending the form ----------
  form.addEventListener("submit", function (event) {
    event.preventDefault();                       // stop the page reloading

    var problems = [];
    fieldIds.forEach(function (id) {
      if (!validateField(id)) { problems.push(id); }
    });

    if (problems.length > 0) {
      summary.textContent = "Please fix " + problems.length +
        (problems.length === 1 ? " highlighted field" : " highlighted fields") + " before sending.";
      summary.hidden = false;
      focusTargetOf(problems[0]).focus();          // jump to the first problem
      return;
    }

    summary.hidden = true;

    // Immediate feedback while the answer is worked out
    submitBtn.disabled = true;
    submitBtn.textContent = "Checking availability...";
    form.setAttribute("aria-busy", "true");

    setTimeout(function () {
      showResponse();
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Enquiry";
      form.removeAttribute("aria-busy");
    }, 700);
  });

  // ---------- The response ----------
  function showResponse() {
    var service  = findService(typeMenu.value, itemMenu.value);
    var date     = parseEnquiryDate(dateBox.value).date;
    var branch   = BRANCHES[branchMenu.value];
    var hours    = hoursFor(date);
    var phone    = cleanPhone(phoneBox.value);
    var method   = contactSet.querySelector("input:checked").value;
    var firstName = nameBox.value.trim().split(/[\s]+/)[0];
    var reference = "DB-" + (100000 + Math.floor(Math.random() * 900000));

    var contactWhere = method === "email"
      ? emailBox.value.trim()
      : showPhone(phone);

    var priceText = (service.from ? "From " : "") + formatRand(service.price);

    // The rows of the answer: [label, value]
    var rows = [
      ["Reference",            reference],
      ["Service",              service.name],
      ["Estimated price",      priceText],
      ["Estimated time",       formatDuration(service.minutes)],
      ["Branch",               branch.name + ", " + branch.address],
      ["Requested appointment", DAY_NAMES[date.getDay()] + " " + date.getDate() + " " +
                                MONTH_NAMES[date.getMonth()] + " " + date.getFullYear() +
                                " at " + timeMenu.value],
      ["Availability",         "This time is inside our opening hours (" + hours.text +
                                ") and leaves enough time to finish your service. A team member will confirm the exact slot."],
      ["We will reply by",     method + " on " + contactWhere + " within one working day"]
    ];

    if (detailsBox.value.trim() !== "") {
      rows.push(["Your notes", detailsBox.value.trim()]);
    }

    // Build the answer box with DOM methods
    response.innerHTML = "";
    response.appendChild(makeEl("h3", "", "Thank you, " + firstName + "! Your enquiry is in."));
    response.appendChild(makeEl("p", "", "Here is what we have worked out for you:"));

    var list = makeEl("dl", "response-list");
    rows.forEach(function (row) {
      list.appendChild(makeEl("dt", "", row[0]));
      list.appendChild(makeEl("dd", "", row[1]));
    });
    response.appendChild(list);

    if (service.note) {
      response.appendChild(makeEl("p", "response-note", "Good to know: " + service.note));
    }

    var actions = makeEl("div", "response-actions");
    var again = makeEl("button", "btn", "Make another enquiry");
    again.type = "button";
    again.addEventListener("click", resetForm);
    actions.appendChild(again);
    actions.appendChild(makeEl("p", "response-call", "Need to change something? Call " + branch.name + " on " + branch.phone + "."));
    response.appendChild(actions);

    form.hidden = true;
    response.hidden = false;
    response.focus();                  // move the keyboard focus to the answer
  }

  // Go back to a fresh, empty form
  function resetForm() {
    form.reset();
    fillItems("");
    fillTimes();
    counter.textContent = "0 / 300";
    fieldIds.forEach(function (id) {
      document.getElementById(id + "-error").textContent = "";
      groupOf(id).classList.remove("has-error");
    });
    summary.hidden = true;
    response.hidden = true;
    form.hidden = false;
    nameBox.focus();
  }
}
