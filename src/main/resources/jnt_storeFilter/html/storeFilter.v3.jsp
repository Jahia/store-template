<%@ taglib prefix="functions" uri="http://www.jahia.org/tags/functions" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="jcr" uri="http://www.jahia.org/tags/jcr" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%--@elvariable id="currentNode" type="org.jahia.services.content.JCRNodeWrapper"--%>
<%--@elvariable id="renderContext" type="org.jahia.services.render.RenderContext"--%>
<%-- Les styles--%>
<template:addResources type="javascript" resources="storeUtils.js"/>
<template:addResources type="javascript"
                       resources="libraries/datahref.jquery.js, libraries/jquery.mobil.custom.min.js"/>
<template:addResources type="javascript" resources="libraries/bloodhound/bloodhound.min.js"/>
<template:addResources type="javascript" resources="libraries/benalman/debounce.js"/>
<template:addResources type="inlinejavascript">
    <script type="text/javascript">
        var categories = null;
        var statuses = null;
        var filterManager = new FiltersManager();
        var filterClicked = false;
        var DEFAULT_CATEGORY_FILTER = 'all';
        var DEFAULT_STATUS_FILTER = 'all';

        function setupFilters() {
            //Setup Isotope
            var $isotope = $('.filter-grid');
            _.each($('.filter-grid'), function (grid) {
                var $grid = $(grid);
                $grid.isotope({
                    itemSelector: '[data-filter-categories]',
                    percentPosition: true,
                    masonry: {
                        columnWidth: '.grid-sizer'
                    }
                });
            });
            filterManager.initializeIsotope($isotope);
            //Add default value to filter manager
            filterManager.addValue(filterManager.CATEGORIES, DEFAULT_CATEGORY_FILTER);
            filterManager.addValue(filterManager.STATUS, DEFAULT_STATUS_FILTER);
            filterManager.filterItems([filterManager.CATEGORIES, filterManager.TAGS, filterManager.STATUS]);

            //Setup Quick Search Filter
            //Currently disabled.
//            var $quicksearch = $('.quicksearch').keyup( debounce( function() {
//                var regexVal = $quicksearch.val().split(/\s+/).join('.*');
//                filterManager.resetFilter(filterManager.QUICKSEARCH);
//                filterManager.addValue(filterManager.QUICKSEARCH, regexVal);
//                filterManager.filterItems();
//                afterFilterItems();
//            }, 200 ) );

            //Debounce so filtering doesn't happen every millisecond
            function debounce(fn, threshold) {
                var timeout;
                return function debounced() {
                    if (timeout) {
                        clearTimeout(timeout);
                    }
                    function delayed() {
                        fn();
                        timeout = null;
                    }

                    timeout = setTimeout(delayed, threshold || 100);
                }
            }
        }

        function dropdownFilterClick(el) {
            //remove or add filter
            //Set flag so that we don't close the dropdown when selecting/deselecting a filter.
            filterClicked = true;
            var $el = $(el);
            var filterType = $el.attr('data-filter-type');
            var $li = $el.parent('li');
            var filterValue = $el.attr('data-filter');

            //If it's the default filter type
            if (filterValue == getDefaultFilterValue(filterType)) {
                if ($li.hasClass('active') && filterManager.getFilterContainerSize(filterType, getDefaultFilterValue(filterType)) > 1) {
                    $li.removeClass('active');
                } else if (!$li.hasClass('active')) {
                    $li.siblings('li').removeClass('active');
                    $li.addClass('active');
                    filterManager.resetFilter(filterType);
                    filterManager.addValue(filterType, getDefaultFilterValue(filterType));
                }
            } else if (filterManager.containsValue(filterType, filterValue)) {
                filterManager.removeValue(filterType, filterValue);
                $li.removeClass('active');
                //if no categories remain, then select ALL
                if (filterManager.isEmpty(filterType)) {
                    $li.siblings('.default').addClass('active');
                    filterManager.addValue(filterType, getDefaultFilterValue(filterType));
                }
            } else {
                filterManager.addValue(filterType, filterValue);
                $li.addClass('active');
                //Remove default 'all' filter if it is selected.
                $li.siblings('.default').removeClass('active');
                filterManager.removeValue(filterType, getDefaultFilterValue(filterType))
            }
            filterManager.filterItems([filterManager.CATEGORIES, filterManager.TAGS, filterManager.STATUS]);
            afterFilterElements();

            function getDefaultFilterValue(filterType) {
                switch (filterType) {
                    case filterManager.CATEGORIES:
                        return DEFAULT_CATEGORY_FILTER;
                    case filterManager.STATUS:
                        return DEFAULT_STATUS_FILTER;
                }
            }
        }

        function tagFilterClick(el) {
            var $checkboxes = $('#myModal').find('input[type="checkbox"]');
            filterManager.resetFilter(filterManager.TAGS);
            $checkboxes.each(function (index, checkbox) {
                var $checkbox = $(checkbox);
                if ($checkbox.prop('checked')) {
                    filterManager.addValue(filterManager.TAGS, $checkbox.val());
                }
            });
            filterManager.filterItems([filterManager.CATEGORIES, filterManager.TAGS, filterManager.STATUS]);
            afterFilterElements();
        }

        function updateDropdownFilterCount(filterType) {
            var filteredElementsCount = filterManager.getFilterTypeElementCount(filterType);
            _.each(getFilters(filterType), function (filterId) {
                var filterBadge = $('a[data-filter*="' + filterId + '"][data-filter-type="' + filterType + '"] > span.badge');
                if (filteredElementsCount[filterId] > 0) {
                    filterBadge.html(filteredElementsCount[filterId]);
                    filterBadge.show();
                } else {
                    filterBadge.hide();
                }
            });
        }

        function getFilters(filterType) {
            switch (filterType) {
                case filterManager.CATEGORIES:
                    return categories;
                case filterManager.STATUS:
                    return statuses;
            }
        }

        function generateStatusIconSpan(status, subClassType) {
            var icon = null;
            var size = subClassType == 'filter' ? 16 : 13;
            switch (status) {
                case 'supported':
                    icon = 'check_circle';
                    break;
                case 'community' :
                    icon = 'group_work';
                    break;
                case 'labs' :
                    icon = 'bug_report';
                    break;
                case 'prereleased':
                    icon = 'offline_pin';
                    break;
                case 'deprecated':
                    icon = 'elderly';
                    break;
            }
            return '<span class="module-' + subClassType + '-badge-' + size + ' module-' + status + '"><i class="material-icons noselect" title="' + status + '">' + icon + '</i></span>';

        }

        $(document).ready(function () {
            //buildTagModal();
            tagSystem.init();
            tagSystem.showTopTags();

            //Get module Categories and init the filter selectors
            categories = getSortedCategories(modulesCategories);
            //Add categories selectors sorted
            var categorySelectorElement = $("ul#categoryList");
            $.each(categories, function (index, categoryString) {
                var categorySplit = categoryString.split("--categoryID--");
                categories[index] = categorySplit[1];
                categorySelectorElement.append("<li><a href='#' class='forge-filter-field' data-filter='" + categorySplit[1] + "' data-filter-type='" + filterManager.CATEGORIES + "' " + " onclick='dropdownFilterClick(this);'>" + categorySplit[0] + "&nbsp;<span class='badge' style='vertical-align: text-top;'>0</span></a></li>");
            });
            var statusSelectorElement = $("ul#statusList");
            statuses = getSortedStatus(modulesStatus);
            _.each(statuses, function (statusString, index) {
                var statusSplit = statusString.split("--statusKey--");
                statuses[index] = statusSplit[1];
                statusSelectorElement.append("<li><a href='#' class='forge-filter-field' data-filter='" + statusSplit[1] + "' data-filter-type='" + filterManager.STATUS + "' " + " onclick='dropdownFilterClick(this);'>" + generateStatusIconSpan(statusSplit[1], "filter") + statusSplit[0] + "&nbsp;<span class='badge' style='vertical-align: text-top;'>0</span></a></li>");
            });
            categories.push('all');
            statuses.push('all');
            $('.dropdown.categories').on('hide.bs.dropdown', clearFilterSelected);
            $('.dropdown.status').on('hide.bs.dropdown', clearFilterSelected);
            //Add event handler for modal apply filter button
            $('.btn-aply-filter').on('click', tagFilterClick);
            setupFilters();
            afterFilterElements();

            function clearFilterSelected($event) {
                //Dont close the dropdown if its a filter that has been selected/deselected
                if (filterClicked) {
                    $event.preventDefault();
                }
                //reset the flag.
                filterClicked = false;
            }
        });

        // flatten object by concatting values
        function concatValues(obj) {
            var value = '';
            for (var prop in obj) {
                value += obj[prop];
            }
            return value;
        }

        var tagSystem = {
            topTagsNumber: 40,
            topTags: [],
            searchEngine: null,
            targetElement: null,
            init: function () {
                this.headingElement = $("h4#tags-heading");
                this.headingElement.html("Top 40 tags");
                this.targetElement = $("ul#tag-display");
                this.topTags = getTopKTags(tagCountMap, this.topTagsNumber).sort();
                this.searchEngine = new Bloodhound({
                    initialize: true,
                    local: getSortedTags(modulesTags),
                    queryTokenizer: Bloodhound.tokenizers.whitespace,
                    datumTokenizer: Bloodhound.tokenizers.whitespace
                });
                var self = this;
                $("#usr").on("input", $.debounce(500, function (e) {
                    self.showSuggestedTags.call(self, e.currentTarget.value);
                }))
            },

            showTopTags: function () {
                var columnsNbr = Math.max(Math.ceil(this.topTags.length / 25), 4);
                this.headingElement.removeClass("hide").addClass("show");
                this.targetElement.empty();
                for (var i in this.topTags) {
                    var tagString = this.topTags[i];
                    this.targetElement.append('<li><div class="tag-selector"><label><input type="checkbox" name="checkbox" value="' + tagString + '" class="fs1">' + tagString + '</label></div></li>');
                }
                this.targetElement.attr("style", "columns:" + columnsNbr + ";webkit-columns:" + columnsNbr + ";-moz-columns:" + columnsNbr + ";");
            },

            showSuggestedTags: function (query) {
                var self = this;
                this.searchEngine.search(query, function (data) {
                    if (query === "") {
                        self.showTopTags();
                        return;
                    }
                    self.headingElement.addClass("hide").removeClass("show");
                    self.targetElement.empty();
                    var columnsNbr = Math.max(Math.ceil(data.length / 25), 2);
                    for (var i in data) {
                        var tagString = data[i];
                        self.targetElement.append('<li><div class="tag-selector"><label><input type="checkbox" name="checkbox" value="' + tagString + '" class="fs1">' + tagString + '</label></div></li>');
                    }
                    self.targetElement.attr("style", "columns:" + columnsNbr + ";webkit-columns:" + columnsNbr + ";-moz-columns:" + columnsNbr + ";");
                });
            }
        };

        function updateFilterRendering() {
            var $filter = $(".filter-info");
            $filter.empty();

            var statusChildren = $("#statusList").children(".active").children("a");
            statusChildren.each(function (index, status) {
                var value = $(status).data("filter");
                if (value != "all") {
                    $filter.append("<li class='filter-status'>" + status.childNodes[1].data + generateStatusIconSpan($(status).attr('data-filter'), "tag") + '</li>');
                }
            });
            var children = $("#categoryList").children(".active").children("a");
            children.each(function (index, category) {
                var value = $(category).data("filter");
                if (value != "all") {
                    $filter.append("<li class='filter-category'>" + category.childNodes[0].data + '</li>');
                }
            });
            var $checkboxes = $('#myModal').find('input[type="checkbox"]').filter(":checked");
            $checkboxes.each(function (index, tag) {
                $filter.append("<li class='filter-tag'>" + $(tag).val() + '</li>');
            });

            var $searchResultsCount = $(".searchResultsCount");
            $searchResultsCount.html(filterManager.getTotalFilteredElementCount());
        }

        /**
         * @function
         * This function will hide any filter grid container that does not display any elements
         */
        function updateGridVisibility() {
            var $grid = $('div.filter-grid-container');
            $grid.each(function (index, el) {
                var $el = $(el);
                if ($el.find('div[data-filter-element="show"]').length > 0) {
                    $el.css('visibility', "visible");
                } else {
                    $el.css('visibility', "hidden");
                }
            });
        }

        function afterFilterElements() {
            updateDropdownFilterCount(filterManager.CATEGORIES);
            updateDropdownFilterCount(filterManager.STATUS);
            updateFilterRendering();
            updateGridVisibility();
        }
    </script>
</template:addResources>
<fmt:message key="jnt_forgeEntry.status.community" var="communityLabel"/>
<fmt:message key="jnt_forgeEntry.status.labs" var="labsLabel"/>
<fmt:message key="jnt_forgeEntry.status.prereleased" var="prereleasedLabel"/>
<fmt:message key="jnt_forgeEntry.status.supported" var="supportedLabel"/>
<fmt:message key="jnt_forgeEntry.status.legacy" var="legacyLabel"/>
<ul class="nav navbar-nav navbar-right">
    <button type="button" class="btn btn-default btn-tagsmodal" data-toggle="modal" data-target="#myModal">Tags</button>
    <button type="button" class="btn btn-default btn-tagsmodal" style="margin-left:0px;" onclick="window.location.href='${url.server}${url.context}/feed';"><img src="<c:url value='/modules/store-template/img/rss.png'/>" alt=""/></button>
    <li class="dropdown status">
        <a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true"
           aria-expanded="false">
            <fmt:message key="jnt_storefilter.label.certification"/> <span class="caret"></span>
        </a>
        <ul class="dropdown-menu filters" id="statusList">
            <li class="active default">
                <a href="#" data-filter="all" data-filter-type="status" onclick="dropdownFilterClick(this);">
                    <fmt:message key="jnt_storefilter.label.all"/>
                    &nbsp;
                    <span class='badge' style='vertical-align: text-top;'>0</span>
                </a>
            </li>
            <li role="separator" class="divider"></li>
        </ul>
    </li>
    <li class="dropdown categories">
        <a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true"
           aria-expanded="false">
            <fmt:message key="jnt_storefilter.label.categories"/> <span class="caret"></span>
        </a>
        <ul class="dropdown-menu filters" id="categoryList">
            <li class="active default">
                <a href="#" data-filter="all" data-filter-type="categories" onclick="dropdownFilterClick(this);">
                    <fmt:message key="jnt_storefilter.label.all"/>
                    &nbsp;
                    <span class='badge' style='vertical-align: text-top;'>0</span>
                </a>
            </li>
            <li role="separator" class="divider"></li>
        </ul>
    </li>
</ul>