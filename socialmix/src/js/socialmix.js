/***********************************************
socialmix  1.3.2
jQuery Socialmix Timeline 
Copyright (c) Andrea Di Toro 
http://kodiga.com/jquery-socialmix-timeline/ 
***********************************************/

(function ($) {
    "use strict";

    /*****************************
    Main jquery plugin
    ****************************/
    $.fn.socialmix = function (userOptions) {
        //Populate Data and Utils object
        Data.$userContainer = $(this);
        Data.options = $.extend($.fn.socialmix.defaults, userOptions);
        $.fn.socialmix.utils.options = Data.options;
        $.fn.socialmix.utils.options.templateManager = TemplateManager;
        Utils = $.fn.socialmix.utils;
        //Load required library
        Loader.require(function () {
            Utils.ini();
            TemplateManager.ini();
            FeedManager.ini();
        });
        return this;
    };

    /*****************************
    Data: Object for general data storage
    ****************************/
    var Data = {
        options: {},
        $userContainer: null,
        $generalContainer: null,
        $cardContainer: null,
        $filterContainer: null,
        $cards: null
    };
    /**************************
    Utils: Object containing utility functions
    **************************/
    var Utils = {};

    /************************
    FeedManager: manage interaction whit server, retrive and sort feeds 
    ************************/
    var FeedManager = {

        //Initialize FeedManager objects
        ini: function () {
            this.loadFeed();
        },

        //Load feeds from server and trasform in a common format
        loadFeed: function () {
            var deferreds = [],
                loadedEntries = [];
            $.each(Data.options.feeds, function (i, feed) {
                var url, params;

                //custom object avoid 
                if (feed.type === "custom_object") {
                    var data = window[feed.id];
                    var tags = (feed.tags !== undefined) ? feed.tags : [];
                    tags = TemplateManager.populateTagList(tags);
                    var feeds = Utils.mapFeeds(feed, data, tags);
                    loadedEntries = loadedEntries.concat(feeds);
                    return;
                }
                //required params
                params = {
                    id: feed.id,
                    type: feed.type,
                };
                url = Data.options.proxy;
                //optional params
                if (feed.resources) {
                    params.resources = feed.resources;
                }
                if (feed.target) {
                    params.target = feed.target;
                }

                if (feed.type === "custom") {
                    url = feed.id;
                    params = {};
                }

                var def = $.get(url, params, function (data) {
                    var tags = (feed.tags !== undefined) ? feed.tags : [];
                    tags = TemplateManager.populateTagList(tags);
                    var individuals = (feed.individuals !== undefined) ? feed.individuals : [];
                    individuals = TemplateManager.populateIndividualList(individuals);
                    var feeds = Utils.mapFeeds(feed, data, tags);
                    loadedEntries = loadedEntries.concat(feeds);
                }).fail(function (jqxhr) {
                    if (jqxhr.responseJSON.hasOwnProperty("message")) {
                        console.error(jqxhr.responseJSON.message);
                    }
                });
                deferreds.push(def);
            });

            //when all ajax calls end call loadFeedEnd
            $.when.apply($, deferreds).then(function () {
                FeedManager.loadFeedEnd(loadedEntries);

            }).fail(function () {
                FeedManager.loadFeedEnd(loadedEntries);
            });
        },

        //Sort all feed entries by date and call render method 
        loadFeedEnd: function (entries) {
            var entrySortDesc = {
                aMajorB: -1,
                aMinorB: 1
            };
            var entrySortAsc = {
                aMajorB: 1,
                aMinorB: -1
            };
            var entrySort = {};

            if (Data.options.sortCards === "desc") {
                entrySort = entrySortDesc;
            } else {
                entrySort = entrySortAsc;
            }

            entries.sort(function (entryA, entryB) {
                if (entryA.systemDate.valueOf() > entryB.systemDate.valueOf()) {
                    return entrySort.aMajorB;
                }
                return entrySort.aMinorB;
            });
            if (Data.options.maxCardNumber) {
                entries = entries.slice(0, Data.options.maxCardNumber);
            }

            TemplateManager.renderFeed(entries);
        }
    };

    /******************************
    TemplateManagers: manage templates, renders, events and all DOM interaction
    *******************************/
    var TemplateManager = {
        cardTemplate: "",
        containerTemplate: "",
        cardsManager: null,
        popUp: null,
        n_imgs: 0,
        sourceRssId: 0,
        //uniqueTags: [],
        individualsData: [],
        tagsData: [],
        timePoints: [],
        individuals: [],
        individualCounter: 0,
        individualCounter: 0,
        filtersWidth: 0,
        //append container and initialize common variables
        ini: function () {

            var $container = Mustache.render(TemplateManager.containerTemplate, Data.options.translate);
            Data.$userContainer.append($container);

            // store html reference to avoid multiple DOM queries
            Data.$generalContainer = Data.$userContainer.find(".sm-container");
            Data.$filterContainer = Data.$userContainer.find(".sm-filter-container");
            Data.$cardContainer = Data.$userContainer.find(".sm-card-container");

            TemplateManager.loadEvent();
        },

        // Attach all event handlar 
        loadEvent: function () {

            $(window).scroll(this.showHideScrollTop);
            $(window).resize(function () {
                if (TemplateManager.cardsManager) {
                    TemplateManager.cardsManager.fitCards();
                }
                TemplateManager.showHideFilterContainer();
            });

            Data.$generalContainer.on("click", ".sm-scrollToTop", this.scrolTop);
            Data.$generalContainer.on("click", ".sm-goto a", this.goToDate);

            Data.$generalContainer.on("click", ".sm-filter-tag a", {
                dropdownClass: ".sm-filter-tag",
                filterType: "filterTag"
            }, this.onClickFilter);
            Data.$generalContainer.on("click", ".sm-filter-date a", {
                dropdownClass: ".sm-filter-date",
                filterType: "filterDate"
            }, this.onClickFilter);
            Data.$generalContainer.on("click", ".sm-card a.card-filter", {
                dropdownClass: ".sm-filter-tag",
                filterType: "filterTag"
            }, this.onClickFilter);
            Data.$generalContainer.on("click", ".sm-filter-source a", {
                dropdownClass: ".sm-filter-source",
                filterType: "filterSource"
            }, this.onClickFilter);

            Data.$generalContainer.on("click", this.closeAllDropDown);
            Data.$generalContainer.on("click", ".sm-dropdown", this.openCloseDropdown);

        },

        showFilters: function () {
            $(this).hide();
            Data.$filterContainer.find(".sm-dropdown").show();
        },

        //manage the click on filters dropdown
        onClickFilter: function (event) {
            var filterClass = $(this).attr("value");
            var filterType = event.data.filterType;
            var $dropdown = Data.$filterContainer.find(event.data.dropdownClass);
            TemplateManager.applyFilterMix($dropdown, filterClass, filterType);
            return false;
        },

        //render entries and insert into the DOM
        renderFeed: function (entries) {

            Mustache.parse(TemplateManager.cardTemplate);
            $.each(entries, function (i, entry) {
                entry.optShowCardTags = Data.options.showCardTags;
                var $output = $(Mustache.render(TemplateManager.cardTemplate, entry));
                TemplateManager.addItemTimeFilter(entry.systemDate, entry.tagDate);
                Data.$cardContainer.append($output);
            });

            Data.$cards = Data.$generalContainer.find(".sm-card");

            TemplateManager.animateCards();
            if (Data.options.displayMode === "timeline") {
                TemplateManager.cardsManager = new TimelineCardManager();

            }
            if (Data.options.displayMode === "grid") {
                TemplateManager.cardsManager = new GridCardManager();

            }

            TemplateManager.createTagFilter();
            TemplateManager.removeLoader();
            AsyncMedia.load();
            Sharer.ini();
            $(document).trigger("smFeedsLoaded");
            var api = new Api(TemplateManager.cardsManager);
            Data.$userContainer.data("socialmix", api);
        },

        //close all open dropdown 
        closeAllDropDown: function () {

            Data.$generalContainer.find(".sm-dropdown-open").removeClass("sm-dropdown-open");
            Data.$generalContainer.find(".sm-open-share-box").removeClass("sm-open-share-box");
        },

        // open or close one dropwn element
        openCloseDropdown: function () {
            if ($(this).hasClass("sm-dropdown-open")) {
                $(this).removeClass("sm-dropdown-open");
            } else {
                $(this).addClass("sm-dropdown-open");
            }
            return false;
        },

        // show or hide scrollTop button
        showHideScrollTop: function () {
            if ($(this).scrollTop() > 100) {
                Data.$generalContainer.find(".sm-scrollToTop").fadeIn();
            } else {
                Data.$generalContainer.find(".sm-scrollToTop").fadeOut();
            }
        },


        // move scroll page to top
        scrolTop: function () {
            $("html, body").animate({
                scrollTop: 0
            }, 800);
            return false;
        },

        //move scroll to a timeline date
        goToDate: function () {
            var date = $(this).attr("value");
            var firstCardDate = Data.$cards.not(".sm-hidden").filter("." + date).eq(0);
            if (Data.options.oneColumnHeight) {

                Data.$generalContainer.animate({
                    scrollTop: firstCardDate.offset().top - 100
                }, 800);
            } else {

                $("html, body").animate({
                    scrollTop: firstCardDate.offset().top
                }, 800);
            }
        },

        //marck dropdown option as selected
        markAsSelected: function ($dropdown, filterClass) {
            var text = $dropdown.find("a[value='" + filterClass + "']").html();
            $dropdown.find(".sm-dropdown-selected").html(text);
            TemplateManager.closeAllDropDown();
        },

        applyFilterMix: function ($dropdown, filterClass, filterType) {
            TemplateManager.markAsSelected($dropdown, filterClass);
            var tmpVisible = Data.$cards.filter(".sm-hidden").filter("." + filterType);
            if (filterClass !== "all") {
                tmpVisible = tmpVisible.filter("." + filterClass);
                tmpVisible.removeClass(filterType);
            } else {
                tmpVisible.removeClass(filterType);
            }

            tmpVisible.not(".filterIndividuals").not(".filterTag").not(".filterDate").removeClass("sm-hidden");

            if (filterClass !== "all") {
                //from hidden 
                Data.$cards.filter(".sm-hidden").not("." + filterClass).addClass("sm-hidden " + filterType);
                //from visible card hide 
                Data.$cards.not(".sm-hidden").not("." + filterClass).addClass("sm-hidden " + filterType);
            }
            TemplateManager.cardsManager.fitCards(true);
            Data.$filterContainer.find(".sm-goto a").hide();
            Data.$cards.not(".sm-hidden").each(function () {
                var classDate = $(this).attr("tag-date");
                Data.$filterContainer.find(".sm-goto a." + classDate).show();

            });
            TemplateManager.animateCards();

            return false;
        },

        addSourceFilter: function (feed) {
            var $elem = "";
            var filterId = feed.type + "-" + feed.id.replace("+", "").replace(".", "");
            if (feed.type !== "custom") {
                $elem = $("<a value='source-" + filterId + "'><i class='sm-icon " + Data.options.icons[feed.type] + "'></i></a>");
            }
            Data.$filterContainer.find(".sm-filter-source .sm-dropdown-content").append($elem);
        },

        customSources: [],

        addCustomSourceFilter: function (sourceKey, sourceLabel) {
            if ($.inArray(sourceKey, TemplateManager.customSources) === -1) {
                TemplateManager.customSources.push(sourceKey);
                var $elem = $("<a value='source-" + sourceKey + "'>" + sourceLabel + "</a>");
                Data.$filterContainer.find(".sm-filter-source .sm-dropdown-content").append($elem);
            }
        },

        setSourceName: function (type, val, user) {
            var $elem = $("<a value='" + val + "'><i class='sm-icon " + Data.options.icons[type] + "'></i>" + user.name + "</a>");
            Data.$filterContainer.find(".sm-filter-source .sm-dropdown-content").append($elem);
        },

        addSourceFilterRss: function (name) {
            if (!Data.options.hideSourceFilter) {
                TemplateManager.sourceRssId++;
                var $elem = $("<a value='source-" + TemplateManager.sourceRssId + "'><i class='sm-icon " + Data.options.icons.rss + "'></i> " + name + "</a>");
                Data.$filterContainer.find(".sm-filter-source .sm-dropdown-content").append($elem);
                return TemplateManager.sourceRssId;
            }
            return 0;
        },

        // add an item to the time filter "goto"
        addItemTimeFilter: function (sysDate, timeDate) {
            if (this.timePoints.indexOf(timeDate) === -1) {
                this.timePoints.push(timeDate);
                var $selectGoTo = Data.$generalContainer.find(".sm-goto .sm-dropdown-content");
                var $selectFilterDate = Data.$generalContainer.find(".sm-filter-date .sm-dropdown-content");

                var strDate = Utils.dateFormatSmall(sysDate);

                $selectGoTo.append("<a class='" + timeDate + "' value='" + timeDate + "'>" + strDate + "</option>");
                $selectFilterDate.append("<a class='" + timeDate + "' value='" + timeDate + "'>" + strDate + "</option>");

            }
        },

        createTagFilter: function () {
            if (Data.options.sortCustomTag) {
                var diff = {
                    max: 0,
                    min: 0
                };
                if (Data.options.sortCustomTagMode === "desc") {
                    diff.max = -1;
                    diff.min = 1;
                } else if (Data.options.sortCustomTagMode === "asc") {
                    diff.max = 1;
                    diff.min = -1;
                }

                this.tagsData.sort(function (tagA, tagB) {
                    if (tagA.name > tagB.name) {
                        return diff.max;
                    }
                    return diff.min;
                });

                this.individualsData.sort(function (tagA, tagB) {
                    if (tagA.name > tagB.name) {
                        return diff.max;
                    }
                    return diff.min;
                });
            }

            $.each(this.tagsData, function (i, tag) {
                var $select = Data.$generalContainer.find(".sm-filter-tag .sm-dropdown-content");
                // console.log('tag hash', tag.hash);
                $select.append("<a  value='" + tag.hash + "'>" + tag.name + "</option>");
            });

            $.each(this.individualsData, function (i, individual) {
                var $select = Data.$generalContainer.find(".sm-filter-source .sm-dropdown-content");
                $select.append("<a  value='" + individual.hash + "'>" + individual.name + "</option>");
            });
        },

        // populate tag filter whit all tags
        populateTagList: function (tags) {
            var tagsData = [];
            $.each(tags, function (i, tag) {
                var tagData = TemplateManager.getTagData(tag);
                tagsData.push(tagData);
            });
            return tagsData;
        },

        //generate a tag id
        getTagData: function (tag) {

            if (TemplateManager.individuals[tag] === undefined) {
                var id = TemplateManager.individualCounter;
                var hash = "sm-tag-" + id;
                TemplateManager.individuals[tag] = hash;
                TemplateManager.individualCounter++;
                var tagObj = {
                    name: tag,
                    hash: hash
                };
                TemplateManager.tagsData.push(tagObj);
                return tagObj;
            } else {
                return {
                    name: tag,
                    hash: TemplateManager.individuals[tag]
                };
            }
        },

        // populate tag filter whit all tags
        populateIndividualList: function (individuals) {
            var individualsData = [];
            $.each(individuals, function (i, individual) {
                var individualData = TemplateManager.getIndividualData(individual);
                individualsData.push(individualData);
            });
            return individualsData;
        },

        //generate a tag id
        getIndividualData: function (individual) {
            if (TemplateManager.individuals[individual] === undefined) {
                var id = TemplateManager.individualCounter;
                var hash = "sm-source-" + id;
                TemplateManager.individuals[individual] = hash;
                TemplateManager.individualCounter++;
                var individualObj = {
                    name: individual,
                    hash: hash
                };
                TemplateManager.individualsData.push(individualObj);
                return individualObj;
            } else {
                return {
                    name: individual,
                    hash: TemplateManager.individuals[individual]
                };
            }
        },

        // remove the loader/spinner from container box
        removeLoader: function () {
            if (!Data.options.hideAllFilters) {
                Data.$filterContainer.show();
                if (Data.options.hideTagsFilters) {
                    Data.$filterContainer.find(".sm-filter-tag").remove();
                }
                if (Data.options.hideDateFilters) {
                    Data.$filterContainer.find(".sm-filter-date").remove();
                }
                if (Data.options.hideSourceFilter) {
                    Data.$filterContainer.find(".sm-filter-source").remove();
                }

                if (Data.options.hideGoToFilter) {
                    Data.$filterContainer.find(".sm-goto").remove();
                }
            } else {
                Data.$filterContainer.find(".sm-dropdown").remove();
            }

            Data.$filterContainer.find(".sm-dropdown").each(function () {
                TemplateManager.filtersWidth += $(this).outerWidth();
            });

            Data.$generalContainer.find(".sm-loader").remove();
            TemplateManager.showHideFilterContainer();
        },

        // open new window 500x400 
        openPopUp: function (url, name) {
            var w = 500;
            var h = 400;
            var left = (screen.width / 2) - (w / 2);
            var top = (screen.height / 2) - (h / 2);

            if (TemplateManager.popUp == null || TemplateManager.popUp.closed) {
                var optionStr = "toolbar=no, location=no, directories=no, status=no, " +
                    "menubar=no, scrollbars=no, resizable=no, copyhistory=no, " +
                    "width=" + w + ", height=" + h + ", top=" + top + ", left=" + left;
                TemplateManager.popUp = window.open(url, name, optionStr);

            } else {
                TemplateManager.popUp.location.href = url;
                TemplateManager.popUp.focus();
            }
        },

        //animate cards based in css3 animations
        animateCards: function () {
            var animationClass = Data.options.animation;
            var animationEnd = "webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend";
            Data.$cards.not(".sm-hidden").slice(0, 20).addClass("sm-" + animationClass).one(animationEnd, function () {
                $(this).removeClass("sm-" + animationClass);

            });
        },

        showHideFilterContainer: function () {
            var containerWidth = Data.$generalContainer.width() - 40;
            Data.$filterContainer.removeClass("sm-filter-container-boxed sm-filter-container-middle-boxed");
            if (TemplateManager.filtersWidth > containerWidth) {
                //Data.$filterContainer.hide();
                if (containerWidth < 400) {
                    Data.$filterContainer.addClass("sm-filter-container-boxed");

                } else {
                    Data.$filterContainer.addClass("sm-filter-container-middle-boxed");
                }
            }
        }
    };

    function Api(cardManager) {
        this.cardsManager = cardManager;

        this.fitCards = function () {
            this.cardsManager.fitCards(true);
        };
    }

    /*************************
    TimelineCardManager : manage  specific cards events, fit cards in cardContainer
    ***************************/
    function TimelineCardManager() {
        this.minDistance = Data.options.timelineCardMargin + 20;
        this.marginB = Data.options.timelineCardMargin;
        this.mininWidthTwoCol = Data.options.timelineMinWidthTwoCol;
        this.oldContainerWidth = 0;
        this.oldMode = "";

        //show the share box when user click on share button
        this.manageShare = function () {
            var box = $(this).parents(".sm-card-header").find(".sm-share-box");
            if (box.hasClass("sm-open-share-box")) {
                box.removeClass("sm-open-share-box");

            } else {
                TemplateManager.closeAllDropDown();
                box.addClass("sm-open-share-box");

            }
            return false;
        };

        //check if  container width is changed and call appropriate method to fit cards
        this.fitCards = function (force) {
            force = force || false;
            var containerWidth = Data.$generalContainer.outerWidth();

            if ((containerWidth === this.oldContainerWidth) && !force) {
                return false;
            }

            this.oldContainerWidth = containerWidth;
            var newMode;
            if (containerWidth > this.mininWidthTwoCol && !Data.options.fixOneColumnMode) {
                newMode = "sm-two-column";
                this.fitCards2Columns(newMode, this.oldMode);

            } else if (containerWidth <= 280) {
                newMode = "sm-one-column-small";
                this.fitCards1Columns(newMode, this.oldMode);

            } else if (containerWidth <= 400) {
                newMode = "sm-one-column-noline";
                this.fitCards1Columns(newMode, this.oldMode);

            } else if (Data.options.oneColumnTimeline) {
                newMode = "sm-one-column-noline";
                this.fitCards1Columns(newMode, this.oldMode);

            } else {
                newMode = "sm-one-column";
                this.fitCards1Columns(newMode, this.oldMode);
            }
            this.oldMode = newMode;

        };

        //fit card on one column mode
        this.fitCards1Columns = function (newMode, oldMode) {
            if (newMode !== oldMode) {
                Data.$generalContainer.removeClass(oldMode).addClass(newMode);
                if (oldMode === "sm-two-column" || oldMode === "") {
                    Data.$cards.removeAttr("style").removeClass("sm-left-side").addClass("sm-right-side");
                    Data.$cardContainer.removeAttr("style");
                }

            }
            var $cards = Data.$cards.not(".sm-hidden");
            if (newMode === "sm-one-column") {
                $cards.first().css("margin-top", "40px");
            } else {
                $cards.first().css("margin-top", "0px");

            }

            if (Data.options.oneColumnHeight) {
                var styles = {
                    height: Data.options.oneColumnHeight,
                    "overflow-y": "scroll"
                };
                Data.$generalContainer.css(styles);
            }


        };

        //fit card on two column mode
        this.fitCards2Columns = function (newMode, oldMode) {
            if (newMode !== oldMode) {
                Data.$generalContainer.addClass(newMode).removeClass(oldMode);
            }
            var cards = Data.$cards.not(".sm-hidden");
            var minDistance = this.minDistance;
            var marginB = this.marginB;
            var last_card = {
                left: {
                    cardStart: 0,
                    cardEnd: 0
                },
                right: {
                    cardStart: 0,
                    cardEnd: 0
                }
            };
            var otheSide = {
                left: "right",
                right: "left"
            };

            $.each(cards, function (i, card) {
                var $card = $(card);
                //select card side 
                var side = "right";
                if (last_card.left.cardEnd <= last_card.right.cardEnd) {
                    side = "left";
                }
                //set card absolute position 
                if (newMode !== oldMode) {
                    $card.removeAttr("style");
                }
                //set top : marginB +  last card end in the same side 
                var top = last_card[side].cardEnd + marginB;

                //if the card in the  other side is too close then  make a jump 
                var distance = top - last_card[otheSide[side]].cardStart;
                if (distance < minDistance) {
                    var delta = (minDistance - distance);
                    top += delta;
                }

                //special case : first card cardStart from top 0px
                if (i === 0) {
                    top = 50;
                }

                //update last card object
                $card.addClass("sm-" + side + "-side").removeClass("sm-" + otheSide[side] + "-side").css("top", top + "px");
                last_card[side] = {
                    cardStart: top,
                    cardEnd: top + $card.height()
                };

            });
            var h = Math.max(last_card.left.cardEnd, last_card.right.cardEnd) + 50;
            Data.$cardContainer.height(h);
        };
        Data.$generalContainer.on("click", ".sm-btn-share , .sm-share-box a ", this.manageShare);
        this.fitCards();

    }

    /*************************
    TimelineCardManager : manage  specific cards events, fit cards in cardContainer
    ***************************/
    function GridCardManager() {
        this.oldContainerWidth = 0;
        this.margin = Data.options.gridCardMargin;
        this.maxColumnNumber = 4;
        this.minCardWidth = Data.options.gridCardMinWidth;

        //show the share box when user click on share button
        this.manageShare = function () {
            var box = $(this).parents(".sm-card-header").find(".sm-share-box");
            if (box.hasClass("sm-open-share-box")) {
                box.removeClass("sm-open-share-box");

            } else {
                TemplateManager.closeAllDropDown();
                box.addClass("sm-open-share-box");

            }
            return false;
        };

        //check if  container width is changed and call appropriate method to fit cards
        this.fitCards = function (force) {
            force = force || false;
            var containerWidth = Data.$generalContainer.outerWidth();

            if ((containerWidth === this.oldContainerWidth) && !force) {
                return false;
            }

            //if fiorst time
            var firstTime = false;
            if (this.oldContainerWidth === 0) {
                firstTime = true;
            }
            this.oldContainerWidth = containerWidth;
            //for small mobile devices!!!! 
            if (this.minCardWidth > containerWidth) {
                this.minCardWidth = containerWidth;
            }
            var margin = this.margin;
            var column = this.maxColumnNumber;
            var cardW = 0;

            while (cardW < this.minCardWidth) {
                cardW = (containerWidth / column) - ((margin / column) * (column - 1));
                column--;
            }
            column++;

            this.fitCardsGrid(column, cardW, margin);
            if (firstTime) {
                Data.$cards.addClass("sm-grid-card");
                Data.$generalContainer.addClass("sm-grid-column");
            }

        };

        //fit card on grid Mode
        this.fitCardsGrid = function (column, cardW, margin) {
            //get all cards
            var cards = Data.$cards.not(".sm-hidden");

            var last_card = [];
            for (var x = 0; x < column; x++) {
                last_card[x] = {
                    top: 0,
                    left: (cardW + margin) * x
                };
            }
            var position = 0;
            //move each card
            $.each(cards, function (i, card) {
                var $card = $(card);
                var top = last_card[position].top;
                var left = last_card[position].left;

                $card.css({
                    top: top,
                    left: left,
                    width: cardW
                });
                last_card[position].top = top + $card.outerHeight() + margin;
                position = getNewPos(column, last_card);

            });

            function getNewPos(column, last_card) {
                var bestTop = Infinity;
                var bestPos = 0;
                for (var x = 0; x < column; x++) {
                    if (last_card[x].top === 0) {
                        return x;
                    }
                    if (last_card[x].top < bestTop) {
                        bestTop = last_card[x].top;
                        bestPos = x;
                    }
                }
                return bestPos;

            }
            //set heaigh of card container
            var maxH = 0;
            for (var xi = 0; xi < column; xi++) {
                if (last_card[xi].top > maxH) {
                    maxH = last_card[xi].top;
                }
            }
            Data.$cardContainer.height(maxH);
        };
        Data.$generalContainer.on("click", ".sm-btn-share , .sm-share-box a ", this.manageShare);
        this.fitCards();
    }


    /*************************
    Sharer : manage share event on specific social network
    ***************************/
    var Sharer = {

        //include include facebook sdk and add event handler
        ini: function () {
            if (Data.options.facebookAppId.length > 1) {
                window.fbAsyncInit = function () {
                    FB.init({
                        appId: Data.options.facebookAppId,
                        xfbml: true,
                        version: "v2.5"
                    });
                };

                (function (d, s, id) {
                    var js, fjs = d.getElementsByTagName(s)[0];
                    if (d.getElementById(id)) {
                        return;
                    }
                    js = d.createElement(s);
                    js.id = id;
                    js.src = "//connect.facebook.net/en_US/sdk.js";
                    fjs.parentNode.insertBefore(js, fjs);
                }(document, "script", "facebook-jssdk"));
            }
            Data.$cardContainer.on("click", ".sm-share-facebook", this.shareOnFacebook);
            Data.$cardContainer.on("click", ".sm-share-gplus", this.shareOnGplus);
            Data.$cardContainer.on("click", ".sm-share-twitter", this.shareOnTwitter);
            Data.$cardContainer.on("click", ".sm-share-linkedin", this.shareOnLinkedin);
        },

        //manage share card on facebook
        shareOnFacebook: function () {
            var shareUrl;
            var url = $(this).attr("share-url");

            if (Data.options.facebookAppId.length > 1) {
                shareUrl = "https://www.facebook.com/dialog/share?app_id=" +
                    Data.options.facebookAppId + "&display=popup&href=" + url;

            } else {
                shareUrl = "https://www.facebook.com/sharer/sharer.php?u=" + url;
            }
            TemplateManager.openPopUp(shareUrl, "sharepopup");
            return false;
        },

        //manage share card on linkedin
        shareOnLinkedin: function () {
            var shareUrl = $(this).attr("share-url");
            var url = "https://www.linkedin.com/shareArticle?mini=true&url=" + shareUrl;
            TemplateManager.openPopUp(url, "sharepopup");
        },

        //manage share card on google plus
        shareOnGplus: function () {
            var shareUrl = $(this).attr("share-url");
            var card = $(this).parents(".sm-card");
            var url;
            if (card.hasClass("source-gplus")) {
                url = shareUrl;
            } else {
                url = "https://plus.google.com/share?url=" + shareUrl;
            }
            TemplateManager.openPopUp(url, "sharepopup");
            return false;

        },

        //manage share card on twitter
        shareOnTwitter: function () {
            var shareUrl = $(this).attr("share-url");
            var card = $(this).parents(".sm-card");
            var url;
            if (card.hasClass("source-twitter")) {
                var tweetId = card.attr("feed-id");
                url = "https://twitter.com/intent/retweet?tweet_id=" + tweetId;
            } else {
                var shareText = Sharer.getShareText(card);
                url = "https://twitter.com/intent/tweet?text=" + shareText + "&url=" + shareUrl;
            }
            TemplateManager.openPopUp(url, "sharepopup");
            return false;
        },

        //get content from card : title, message or text for sharing purpose  
        getShareText: function (card) {
            var title = card.find(".sm-title").text();
            var message = card.find(".sm-message-text").text();
            var text = card.find(".sm-text").text();

            var retval = "";
            if (title !== "") {
                retval = title;
            } else if (message !== "") {
                retval = message;
            } else if (text !== "") {
                retval = text;
            }
            return retval;
        }
    };

    /*****************************
    AsyncMedia : load image and video asynchronously in background 
    *****************************/
    var AsyncMedia = {

        n_imgs: 0,
        imgs: [],
        preloadedImgs: 0,
        loadedImgs: 0,
        cardGroup: [],
        n_video: 0,

        //start loadind all media
        load: function () {
            this.loadImg();
        },

        loadIframe: function () {
            var iframe = Data.$cards.find("iframe.sm-lazy").not(".sm-loaded").slice(0, 1);
            if (iframe.length === 1) {
                var src = $(iframe).attr("data-src");
                $(iframe).attr("src", src);
                $(iframe).on("load", function () {
                    $(this).addClass("sm-loaded");
                    AsyncMedia.loadIframe();
                }).on("error", function () {
                    $(this).addClass("sm-loaded");
                    AsyncMedia.loadIframe();
                });
            } else {
                $(document).trigger("smMediaLoaded");

            }
        },

        // load video 
        loadVideo: function () {
            var videos = Data.$cards.find("video");
            var n_video = videos.length;
            var ready = 0;
            if (n_video === 0) {
                AsyncMedia.loadIframe();
            }
            //when video is ready 
            videos.on("canplaythrough", function () {
                ready++;
                if (n_video === ready) {
                    TemplateManager.cardsManager.fitCards(true);
                    AsyncMedia.loadIframe();
                }
            });
        },

        //load image by small group
        loadImg: function () {
            var cardGroup = Data.$cards.not(".sm-loaded").slice(0, 5);
            var groupImgs = cardGroup.find("img.sm-lazy");

            AsyncMedia.cardGroup = cardGroup;
            AsyncMedia.n_imgs = groupImgs.length;
            AsyncMedia.preloadedImgs = 0;
            AsyncMedia.loadedImgs = 0;
            AsyncMedia.imgs = groupImgs;

            //preload images in a detached <img/>  
            $.each(groupImgs, function (i, img) {
                var inisrc = $(img).attr("ini-src");

                $("<img/>").attr("src", inisrc).on("load", function () {
                    AsyncMedia.onPreload(groupImgs);
                }).on("error", function () {
                    AsyncMedia.onPreload(groupImgs);
                });
            });

            if (cardGroup.length === 0) {
                AsyncMedia.loadVideo();

            } else if (groupImgs.length === 0) {
                AsyncMedia.onGroupLoaded();
            }


        },
        //every preload check if all image whas loaded
        onPreload: function (groupImgs) {
            AsyncMedia.preloadedImgs++;
            if (AsyncMedia.preloadedImgs === AsyncMedia.n_imgs) {
                AsyncMedia.finalLoad(groupImgs);
            }
        },

        //load preloaded images
        finalLoad: function (groupImgs) {
            groupImgs.on("load", AsyncMedia.onImageLoaded)
                .on("error", AsyncMedia.onImageError);
            $.each(groupImgs, function (i, img) {
                var $img = $(img);
                var inisrc = $img.attr("ini-src");
                if (inisrc) {
                    $img.attr("src", inisrc);
                }
            });
        },

        //on image load check if all image are loaded
        onImageLoaded: function () {
            $(this).parents(".sm-image-item").addClass("sm-loaded");
            AsyncMedia.loadedImgs++;
            AsyncMedia.filterImage($(this));
            if (AsyncMedia.loadedImgs === AsyncMedia.n_imgs) {
                AsyncMedia.onGroupLoaded();
            }
        },

        //on image error check if all image are loaded
        onImageError: function () {
            AsyncMedia.loadedImgs++;
            if (AsyncMedia.loadedImgs === AsyncMedia.n_imgs) {
                AsyncMedia.onGroupLoaded();
            }
        },

        // filter image by image size. Remove image if size is small
        filterImage: function (img) {
            var limit = Data.options.carouselHeigth / 3;
            if (img.width() < limit || img.height() < limit) {
                img.parents(".sm-image-item").remove();
            }

        },

        //when a image-group is loaded show images, call slick slider and finaly
        //load next image-group 
        onGroupLoaded: function () {
            $.each(AsyncMedia.cardGroup, function (i, card) {
                var $card = $(card).addClass("sm-loaded");
                var imgs = $card.find(".sm-image-box .sm-loaded img.sm-lazy");

                if (imgs.length === 1) {
                    imgs.addClass("sm-single-img");


                } else if (imgs.length > 1) {
                    imgs.height(Data.options.carouselHeigth);
                    $card.find(".sm-image-box").slick({
                        infinite: true,
                        speed: 300,
                        slidesToShow: 1,
                        variableWidth: true,
                        touchMove: true,
                        centerMode: true,
                        dots: false,
                        responsive: true,
                        prevArrow: "<div  class='slick-prev new'><i class='fa fa-angle-left'></i></div>",
                        nextArrow: "<div  class='slick-next new'><i class='fa fa-angle-right'></i></div>"

                    });
                }
                $card.find(".sm-link-pop").magnificPopup({
                    type: "image",
                    image: {
                        titleSrc: "data-title"
                    }
                });

            });

            TemplateManager.cardsManager.fitCards(true);
            setTimeout(function () {
                AsyncMedia.loadImg();
            }, 300);
        }
    };

    /***********************
    Loader : loade all dependencies (css, js , html)
    ***********************/
    var Loader = {

        require: function (callback) {
            var dependencies = Data.options.dependencies;
            var removeDependencies = Data.options.removeDependencies;
            var basePath = Data.options.basePath;
            this.loadedDep = 0;
            this.loadedTemplates = 0;
            this.totalDep = 0;
            this.totalTemplates = 2;
            this.callback = callback;

            for (var i = 0; i < dependencies.js.length; i++) {
                var name = dependencies.js[i].name;
                if ($.inArray(name, removeDependencies) === -1) {
                    this.totalDep++;
                    this.loadJs(basePath + dependencies.js[i].src);
                }
            }

            for (var x = 0; x < dependencies.css.length; x++) {
                var cssName = dependencies.css[x].name;
                if ($.inArray(cssName, removeDependencies) === -1) {
                    this.loadCss(basePath + dependencies.css[x].src);
                }
            }
            this.loadTemplates();
        },

        loadJs: function (src) {
            var self = this;
            var s = document.createElement("script");
            s.type = "text/javascript";
            s.src = src;
            s.onload = function () {
                self.loadedDep++;
                self.chackLoaded();
            };
            (document.body).appendChild(s);

        },

        loadCss: function (src) {
            $("<link>", {
                    rel: "stylesheet",
                    type: "text/css",
                    "href": src
                })
                .appendTo("head");
        },

        loadTemplates: function () {
            var self = this;
            $.get(Data.options.basePath + Data.options.cardTemplate, function (template) {
                TemplateManager.cardTemplate = template;
                self.loadedTemplates++;
                self.chackLoaded();
            });
            $.get(Data.options.basePath + Data.options.containerTemplate, function (template) {
                TemplateManager.containerTemplate = template;
                self.loadedTemplates++;
                self.chackLoaded();
            });
        },

        chackLoaded: function () {
            if ((this.loadedDep === this.totalDep) &&
                (this.loadedTemplates === this.totalTemplates)) {
                this.callback();

            }
        }
    };

    /*********************
    DEFAULT OPTION
    *********************/
    $.fn.socialmix.defaults = {
        basePath: "", // required
        proxy: "",

        facebookAppId: "",
        facebookEventDate: "updated", //"event",

        carouselHeigth: 300,

        hideAllFilters: false,
        hideTagsFilters: true,
        hideDateFilters: false,
        hideGoToFilter: true,
        hideSourceFilter: false,

        showCardCustomTags: true,
        sortCustomTag: true,
        sortCustomTagMode: "asc", //desc

        oneColumnTimeline: false,
        oneColumnHeight: "",

        fixOneColumnMode: false,
        displayMode: "timeline",

        gridCardMinWidth: 250,
        gridCardMargin: 40,

        timelineCardMargin: 40,
        timelineMinWidthTwoCol: 650,

        animation: "fadeIn", //slideInUp, slideInDown, fadeIn, fadeInUp,fadeInDown

        sortCards: "desc", // "asc"
        maxCardNumber: false,
        momentLocale: "en",
        momentFormat: "MMMM D  YYYY, HH:mm ",
        momentSmallFormat: "MMMM D YYYY",

        dependencies: {
            js: [{
                    name: "mustache",
                    src: "asset/js/mustache.min.js"
                },
                {
                    name: "anchorme",
                    src: "asset/js/anchorme.min.js"
                },
                {
                    name: "moment",
                    src: "asset/js/moment-with-locales.min.js"
                },
                {
                    name: "slick",
                    src: "asset/js/slick.min.js"
                },
                {
                    name: "lightbox",
                    src: "asset/js/jquery.magnific-popup.min.js"
                }

            ],
            css: [{
                    name: "slick",
                    src: "asset/css/slick.css"
                },
                {
                    name: "font-awesome",
                    src: "asset/css/font-awesome.min.css"
                },
                {
                    name: "lightbox",
                    src: "asset/css/magnific-popup.css"
                }

            ]
        },
        removeDependencies: [],
        cardTemplate: "html/timeline_card.html",
        containerTemplate: "html/timeline_container.html",
        translate: { ///////////////NEW
            filterBy: "Filter By",
            filterByTag: "Filter by category",
            allTags: "All Tags",
            goToDate: "Go to date",
            filterByDate: "Date",
            allDates: "All Dates",
            twitter: "Twitter",
            facebook: "Facebook",
            youtube: "Youtube",
            gplus: "Google +",
            allSources: "All Sources",
            filterBySource: "Source",
            vimeo: "Vimeo"
        },
        icons: {
            twitter: "fa fa-twitter-square",
            facebook: "fa fa-facebook-square",
            gplus: "fa fa-google-plus-square",
            rss: "fa fa-rss-square",
            youtube: "fa fa-youtube-square",
            vimeo: "fa fa-vimeo-square",
            event: "fa fa-calendar-check-o"

        }
    };
}(jQuery));