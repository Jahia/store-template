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
<template:addResources type="javascript" resources="libraries/datahref.jquery.js, libraries/jquery.mobil.custom.min.js"/>
<template:addResources type="inlinejavascript">
    <script type="text/javascript">
        var filterNames = {
            "cert-filter":"<fmt:message key="jnt_storefilter.label.certification"/>",
            "tag-filter":"<fmt:message key="jnt_storefilter.label.tags"/>",
            "cat-filter":"<fmt:message key="jnt_storefilter.label.categories"/>"
        };

        var filters = {
            "cert-filter":"",
            "tag-filter":"",
            "cat-filter":""
        };
        var categories = null;
        var filterManager = new FiltersManager();
        var categoryFilterClicked = false;
        var DEFAULT_CATEGORY_FILTER = 'all';

        function setupFilters() {
            //Setup Isotope
            var $isotope = $('.category-grid').isotope({
                itemSelector: '[data-filter-categories]',
                percentPosition: true,
                masonry: {
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
            function debounce( fn, threshold ) {
                var timeout;
                return function debounced() {
                    if ( timeout ) {
                        clearTimeout( timeout );
                    }
                    function delayed() {
                        fn();
                        timeout = null;
                    }
                    timeout = setTimeout( delayed, threshold || 100 );
                }
            }
        }
        function resetFilters(){

            $(".forge").isotope({filter:''});
            $(".filter-reset").hide();
            console.log("Menus Reset");
            $(".forge-filter").each(function(index,object){
                var id=object.id;
                console.log(id);
                console.log(filterNames[id]);
                $("#"+id).html(filterNames[id]+' <span class="caret"></span>');
            });
            $("li.active").removeClass("active");

        }

        function categoryFilterClick(el){
            //remove or add filter
            //Set flag so that we don't close the dropdown when selecting/deselecting a filter.
            categoryFilterClicked = true;
            var $el = $(el);
            var $li = $el.parent('li');
            var categoryValue = $el.attr('data-filter');
            if (categoryValue == 'all') {
                if ($li.hasClass('active') && filterManager.getFilterContainerSize(filterManager.CATEGORIES, DEFAULT_CATEGORY_FILTER) > 1) {
                    $li.removeClass('active');
                } else if (!$li.hasClass('active')){
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
        }

        function tagFilterClick(el) {
            var $checkboxes = $('#myModal').find('input[type="checkbox"]');
            filterManager.resetFilter(filterManager.TAGS);
            $checkboxes.each(function(index, checkbox) {
                var $checkbox = $(checkbox);
                if ($checkbox.prop('checked')) {
                    console.log($checkbox.val());
                    filterManager.addValue(filterManager.TAGS, $checkbox.val());
                }
            });
            filterManager.filterItems([filterManager.CATEGORIES, filterManager.TAGS]);
            updateCategoriesCount();
        }

        function updateCategoriesCount() {
            var categoryFilteredElementsCount = filterManager.getFilterTypeElementCount(filterManager.CATEGORIES);
            _.each(categories, function(filterId){
                var filterBadge = $('a[data-filter*="' + filterId + '"] > span');
                if (categoryFilteredElementsCount[filterId] > 0 ) {
                    filterBadge.html(categoryFilteredElementsCount[filterId]);
                    filterBadge.show();
                } else {
                    filterBadge.hide();
                }
            });
        }

        $(document).ready(function () {
            //Get module tags and apply them on module html classes in order to be able to filter
            var tags = getSortedTags(modulesTags);
            console.log("TAGS", modulesTags);
            console.log(tagCountMap);
            console.log(getTopKTags(tagCountMap, 10));
            var columnsNbr = Math.ceil(tags.length/25);
            //Add tags selectors sorted
            var tagSelectorElement = $("ul#tag-display");
            var previousTag="";
            $.each(tags, function(index,tagString){
                if(previousTag.length>0){
                    if(tagString.charAt(0) != previousTag.charAt(0)){
                        tagSelectorElement.append('<li role="separator" class="divider"></li>');
                    }
                }
                previousTag = tagString;
//                tagSelectorElement.append("<li><a href='#' class='store-filter' data-filter='.tag-"+tagString.split(" ").join("-")+"' onclick='tagFilterClick(this);'>"+tagString+"</a></li>");
                tagSelectorElement.append('<li><div class="tag-selector"><label><input type="checkbox" name="checkbox" value="' + tagString + '" class="fs1">' + tagString + '</label></div></li>');
            });
            tagSelectorElement.attr("style","columns:"+columnsNbr+";webkit-columns:"+columnsNbr+";-moz-columns:"+columnsNbr+";");

            //Get module Categories and init the filter selectors
            categories = getSortedCategories(modulesCategories);

            //Add categories selectors sorted
            var categorySelectorElement = $("ul#categoryList");
            $.each(categories, function(index,categoryString){
                var categorySplit = categoryString.split("--categoryID--");
                categories[index] = categorySplit[1];
                categorySelectorElement.append("<li><a href='#' class='forge-filter-field' data-filter='" + categorySplit[1] + "' onclick='categoryFilterClick(this);'>"+categorySplit[0]+"&nbsp;<span class='badge' style='vertical-align: text-top;'>0</span></a></li>");
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
        });
        $( function() {
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
        function concatValues( obj ) {
            var value = '';
            for ( var prop in obj ) {
                value += obj[ prop ];
            }
            return value;
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
        <a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">
            <fmt:message key="jnt_storefilter.label.categories"/> <span class="caret"></span>
        </a>
        <ul class="dropdown-menu filters cat-filter-list" id="categoryList">
            <li class="active default"><a href="#" data-filter="all" onclick="categoryFilterClick(this);"><fmt:message key="jnt_storefilter.label.all"/>&nbsp;<span class='badge' style='vertical-align: text-top;'>0</span></a></li></a></li>
            <li role="separator" class="divider"></li>
        </ul>
    </li>
</ul>