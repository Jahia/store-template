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

        var filterManager = new FiltersManager();
        var categoryFilterClicked = false;

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
        function filterClick(el){
            //remove or add filter
            //Set flag so that we don't close the dropdown when selecting/deselecting a filter.
            categoryFilterClicked = true;
            var $el = $(el);
            var $li = $el.parent('li');
            var categoryValue = $el.attr('data-filter');
            console.log(categoryValue);
            if (categoryValue == 'all') {
                if ($li.hasClass('active')) {
                    $li.removeClass('active');
                } else {
                    $li.addClass('active');
                    filterManager.resetFilter(filterManager.CATEGORIES);
                }
            } else if (filterManager.containsValue(filterManager.CATEGORIES, categoryValue)) {
                filterManager.removeValue(filterManager.CATEGORIES, categoryValue);
                $li.removeClass('active');
                //if no categories remain, then select ALL
                if (filterManager.isEmpty(filterManager.CATEGORIES)) {
                    $li.siblings('.default').addClass('active');
                }
            } else {
                filterManager.addValue(filterManager.CATEGORIES, categoryValue);
                $li.addClass('active');
                //Remove default 'all' filter if it is selected.
                $li.siblings('.default').removeClass('active');
            }
            var clicked=$el.html();
            var dropdown = $el.parent().parent().parent();
            var dropToggle = dropdown.find(".dropdown-toggle");
            var filterId=dropToggle.attr('id');
            var title=filterNames[dropToggle.attr('id')];
            //dropToggle.html(title+' ( '+clicked+' )<span class="caret"></span>');
            //$(".filter-reset").show();
        }

        $(document).ready(function () {
            /*$(".store-filter").on(click(function(a,b,c){
                console.log("click");
            }));*/
            /*$(".dropdown-menu li a").click(function(a,b,c){
                console.log("Click !");
                console.log(a.target);
                console.log(a.target.parent().parent().parent());
                //$(".btn:first-child").html($(this).text()+' <span class="caret"></span>');
            });*/
            //$(".tag_select").select2();
            //Get module tags and apply them on module html classes in order to be able to filter
            var tags = getSortedTags(modulesTags);
            var columnsNbr = Math.ceil(tags.length/25);
            //Add tags selectors sorted
            var tagSelectorElement = $("ul#tag");
            var previousTag="";
            $.each(tags, function(index,tagString){
                if(previousTag.length>0){
                    if(tagString.charAt(0) != previousTag.charAt(0)){
                        tagSelectorElement.append('<li role="separator" class="divider"></li>');
                    }
                }
                previousTag = tagString;
                tagSelectorElement.append("<li><a href='#' class='store-filter' data-filter='.tag-"+tagString.split(" ").join("-")+"' onclick='filterClick(this);'>"+tagString+"</a></li>");
            });
            tagSelectorElement.attr("style","columns:"+columnsNbr+";webkit-columns:"+columnsNbr+";-moz-columns:"+columnsNbr+";");

            //Get module Categories and init the filter selectors
            var categories = getSortedCategories(modulesCategories);
            //Add categories selectors sorted
            var categorySelectorElement = $("ul#categoryList");
            $.each(categories, function(index,categoryString){
                var categorySplit = categoryString.split("--categoryID--");
                categorySelectorElement.append("<li><a href='#' class='forge-filter-field' data-filter='.category-"+categorySplit[1]+"' onclick='filterClick(this);'>"+categorySplit[0]+"</a></li>");

            });

            $('.dropdown.categories').on('hide.bs.dropdown', function ($event) {
                //Dont close the dropdown if its a filter that has been selected/deselected
                if (categoryFilterClicked) {
                    $event.preventDefault();
                }
                //reset the flag.
                categoryFilterClicked = false;
            });

        });
        $( function() {
            var qsRegex;

            var $quicksearch = $('.quicksearch').keyup( debounce( function() {
                var regexVal = $quicksearch.val().split(/\s+/).join('.*');
                qsRegex = new RegExp(regexVal, 'gi');
                $grid.isotope();
            }, 200 ) );

            // store filter for each group
            $('.filters').on( 'click', 'a', function() {
                $('#search .quicksearch').val("");
                var $this = $(this);
                var $li =  $this.parent('li');
               // $li.siblings().removeClass('active');
                //$li.addClass('active');
                // get group key
                var $buttonGroup = $this.parents('.dropdown-menu');
                var filterGroup = $buttonGroup.attr('data-filter-group');
                // set filter for group
                filters[ filterGroup ] = $this.attr('data-filter');
                // combine filters
                var filterValue = concatValues( filters );
                $grid.isotope({ filter: filterValue });

            });
            var $grid = $('.forge').isotope({
                itemSelector: '.item',
                layoutMode: 'fitRows',
                filter: function() {

                    if (qsRegex) {
                        return $(this).text().match(qsRegex);
                    } else {
                        $('.filters li').removeClass('active');
                        $('.filters li.all').addClass('active');
                        return true;
                    }
                }
            });

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
        // debounce so filtering doesn't happen every millisecond
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
            <li class="active default"><a href="#" data-filter="all" onclick="filterClick(this);"><fmt:message key="jnt_storefilter.label.all"/></a></li>
            <li role="separator" class="divider"></li>
        </ul>
    </li>
</ul>