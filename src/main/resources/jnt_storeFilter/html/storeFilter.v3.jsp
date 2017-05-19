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
        var filterNames = {
            "cert-filter": "<fmt:message key="jnt_storefilter.label.certification"/>",
            "tag-filter" : "<fmt:message key="jnt_storefilter.label.tags"/>",
            "cat-filter" : "<fmt:message key="jnt_storefilter.label.categories"/>"
        };

        var filters                 = {
            "cert-filter": "",
            "tag-filter" : "",
            "cat-filter" : ""
        };
        var categories              = null;
        var filterManager           = new FiltersManager();
        var categoryFilterClicked   = false;
        var DEFAULT_CATEGORY_FILTER = 'all';

        function setupFilters() {
            //Setup Isotope
            var $isotope = $('.category-grid').isotope({
                itemSelector   : '[data-filter-categories]',
                percentPosition: true,
                masonry        : {
                    columnWidth: '.grid-sizer'
                }
            });
            filterManager.initializeIsotope($isotope);
            //Add default value to filter manager
            filterManager.addValue(filterManager.CATEGORIES, DEFAULT_CATEGORY_FILTER);
            filterManager.filterItems([filterManager.CATEGORIES, filterManager.TAGS]);

            //Setup Quick Search Filter
            //Currently disabled.
//            var $quicksearch = $('.quicksearch').keyup( debounce( function() {
//                var regexVal = $quicksearch.val().split(/\s+/).join('.*');
//                filterManager.resetFilter(filterManager.QUICKSEARCH);
//                filterManager.addValue(filterManager.QUICKSEARCH, regexVal);
//                filterManager.filterItems();
//                updateCategoriesCount();
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
        function resetFilters() {

            $(".forge").isotope({filter: ''});
            $(".filter-reset").hide();
            console.log("Menus Reset");
            $(".forge-filter").each(function (index, object) {
                var id = object.id;
                console.log(id);
                console.log(filterNames[id]);
                $("#" + id).html(filterNames[id] + ' <span class="caret"></span>');
            });
            $("li.active").removeClass("active");

        }

        function categoryFilterClick(el) {
            //remove or add filter
            //Set flag so that we don't close the dropdown when selecting/deselecting a filter.
            categoryFilterClicked = true;
            var $el               = $(el);
            var $li               = $el.parent('li');
            var categoryValue     = $el.attr('data-filter');
            if (categoryValue == 'all') {
                if ($li.hasClass('active') && filterManager.getFilterContainerSize(filterManager.CATEGORIES, DEFAULT_CATEGORY_FILTER) > 1) {
                    $li.removeClass('active');
                } else if (!$li.hasClass('active')) {
                    $li.siblings('li').removeClass('active');
                    $li.addClass('active');
                    filterManager.resetFilter(filterManager.CATEGORIES);
                    filterManager.addValue(filterManager.CATEGORIES, DEFAULT_CATEGORY_FILTER);
                }
            } else if (filterManager.containsValue(filterManager.CATEGORIES, categoryValue)) {
                filterManager.removeValue(filterManager.CATEGORIES, categoryValue);
                $li.removeClass('active');
                //if no categories remain, then select ALL
                if (filterManager.isEmpty(filterManager.CATEGORIES)) {
                    $li.siblings('.default').addClass('active');
                    filterManager.addValue(filterManager.CATEGORIES, DEFAULT_CATEGORY_FILTER);
                }
            } else {
                filterManager.addValue(filterManager.CATEGORIES, categoryValue);
                $li.addClass('active');
                //Remove default 'all' filter if it is selected.
                $li.siblings('.default').removeClass('active');
                filterManager.removeValue(filterManager.CATEGORIES, DEFAULT_CATEGORY_FILTER)
            }
            filterManager.filterItems([filterManager.CATEGORIES, filterManager.TAGS]);
            updateCategoriesCount();
            updateFilterRendering();
        }

        function tagFilterClick(el) {
            var $checkboxes = $('#myModal').find('input[type="checkbox"]');
            filterManager.resetFilter(filterManager.TAGS);
            $checkboxes.each(function (index, checkbox) {
                var $checkbox = $(checkbox);
                if ($checkbox.prop('checked')) {
                    console.log($checkbox.val());
                    filterManager.addValue(filterManager.TAGS, $checkbox.val());
                }
            });
            filterManager.filterItems([filterManager.CATEGORIES, filterManager.TAGS]);
            updateCategoriesCount();
            updateFilterRendering();
        }

        function updateCategoriesCount() {
            var categoryFilteredElementsCount = filterManager.getFilterTypeElementCount(filterManager.CATEGORIES);
            _.each(categories, function (filterId) {
                var filterBadge = $('a[data-filter*="' + filterId + '"] > span');
                if (categoryFilteredElementsCount[filterId] > 0) {
                    filterBadge.html(categoryFilteredElementsCount[filterId]);
                    filterBadge.show();
                } else {
                    filterBadge.hide();
                }
            });
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
                categorySelectorElement.append("<li><a href='#' class='forge-filter-field' data-filter='" + categorySplit[1] + "' onclick='categoryFilterClick(this);'>" + categorySplit[0] + "&nbsp;<span class='badge' style='vertical-align: text-top;'>0</span></a></li>");
            });
            categories.push('all');
            $('.dropdown.categories').on('hide.bs.dropdown', function ($event) {
                //Dont close the dropdown if its a filter that has been selected/deselected
                if (categoryFilterClicked) {
                    $event.preventDefault();
                }
                //reset the flag.
                categoryFilterClicked = false;
            });
            //Add event handler for modal apply filter button
            $('.btn-aply-filter').on('click', tagFilterClick);
            setupFilters();
            updateCategoriesCount();
            updateFilterRendering();
        });
        $(function () {
//            var qsRegex;
//
//            var $quicksearch = $('.quicksearch').keyup( debounce( function() {
//                var regexVal = $quicksearch.val().split(/\s+/).join('.*');
//                qsRegex = new RegExp(regexVal, 'gi');
//                $grid.isotope();
//            }, 200 ) );
//
//            // store filter for each group
//            $('.filters').on( 'click', 'a', function() {
//                $('#search .quicksearch').val("");
//                var $this = $(this);
//                // get group key
//                var $buttonGroup = $this.parents('.dropdown-menu');
//                var filterGroup = $buttonGroup.attr('data-filter-group');
//                // set filter for group
//                filters[ filterGroup ] = $this.attr('data-filter');
//                // combine filters
//                var filterValue = concatValues( filters );
//                $grid.isotope({ filter: filterValue });
//            });
//            var $grid = $('.forge').isotope({
//                itemSelector: '.item',
//                layoutMode: 'fitRows',
//                filter: function() {
//
//                    if (qsRegex) {
//                        return $(this).text().match(qsRegex);
//                    } else {
//                        $('.filters li').removeClass('active');
//                        $('.filters li.all').addClass('active');
//                        return true;
//                    }
//                }
//            });

            var filters = {};
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
            topTags      : [],
            searchEngine : null,
            targetElement: null,
            init         : function () {
                this.targetElement = $("ul#tag-display");
                this.topTags       = getTopKTags(tagCountMap, this.topTagsNumber);
                this.searchEngine  = new Bloodhound({
                    initialize    : true,
                    local         : getSortedTags(modulesTags),
                    queryTokenizer: Bloodhound.tokenizers.whitespace,
                    datumTokenizer: Bloodhound.tokenizers.whitespace
                });
                var self           = this;
                $("#usr").on("input", $.debounce(500, function (e) {
                    self.showSuggestedTags.call(self, e.currentTarget.value);
                }))
            },

            showTopTags: function () {
                var columnsNbr = Math.max(Math.ceil(this.topTags.length / 25), 4);
                this.targetElement.empty();
                <%--this.targetElement.parent().append('<li><fmt:message key="jnt_sortFilter.topTags.label"/></l>');--%>
                <%--this.targetElement.append('<li role="separator" class="divider"></li>');--%>

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
            var children = $("#categoryList").children(".active").children("a");

            children.each(function (index, category) {
                var value = $(category).data("filter");
                if (value != "all") {
                    $filter.append("<li class='filter-category'>" + category.childNodes[0].data + '</li>');
                }
            });
            var $checkboxes = $('#myModal').find('input[type="checkbox"]').filter(":checked");
            $checkboxes.each(function (index, category) {
                $filter.append("<li class='filter-tag'>" + $(category).val() + '</li>');

            });

            var $searchResultsCount = $(".searchResultsCount");
            $searchResultsCount.html(" " + filterManager.getTotalFilteredElementCount());
        }
    </script>
</template:addResources>
<fmt:message key="jnt_forgeEntry.status.community" var="communityLabel"/>
<fmt:message key="jnt_forgeEntry.status.labs" var="labsLabel"/>
<fmt:message key="jnt_forgeEntry.status.prereleased" var="prereleasedLabel"/>
<fmt:message key="jnt_forgeEntry.status.supported" var="supportedLabel"/>
<ul class="nav navbar-nav navbar-right">
    <button type="button" class="btn btn-default btn-tagsmodal" data-toggle="modal" data-target="#myModal">Tags</button>
    <li class="dropdown categories">
        <a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true"
           aria-expanded="false">
            <fmt:message key="jnt_storefilter.label.categories"/> <span class="caret"></span>
        </a>
        <ul class="dropdown-menu filters cat-filter-list" id="categoryList">
            <li class="active default"><a href="#" data-filter="all" onclick="categoryFilterClick(this);"><fmt:message
                    key="jnt_storefilter.label.all"/>&nbsp;<span class='badge'
                                                                 style='vertical-align: text-top;'>0</span></a></li>
            </a></li>
            <li role="separator" class="divider"></li>
        </ul>
    </li>
</ul>