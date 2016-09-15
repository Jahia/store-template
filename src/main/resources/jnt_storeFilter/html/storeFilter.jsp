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
<template:addResources type="javascript" resources="libraries/datahref.jquery.js"/>
<template:addResources type="inlinejavascript">
    <script type="text/javascript">
        $(document).ready(function () {
            //Get module tags and apply them on module html classes in order to be able to filter
            var tags = getSortedTags(modulesTags);

            //Add tags selectors sorted
            var tagSelectorElement = $("ul#tag");
            $.each(tags, function(index,tagString){
                tagSelectorElement.append("<li><a href='#' data-filter='.tag-"+tagString+"'>"+tagString+"</a></li>");
            });

            //Get module Categories and init the filter selectors
            var categories = getSortedCategories(modulesCategories);
            //Add categories selectors sorted
            var categorySelectorElement = $("ul#category");
            $.each(categories, function(index,categoryString){
                var categorySplit = categoryString.split("--categoryID--");
                categorySelectorElement.append("<li><a href='#' data-filter='.category-"+categorySplit[1]+"'>"+categorySplit[0]+"</a></li>");
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
                $li.siblings().removeClass('active');
                $li.addClass('active');
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
<ul class="nav navbar-nav navbar-right">
    <li class="dropdown">
        <a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false"><fmt:message key="jnt_storefilter.label.tags"/> <span class="caret"></span></a>
        <ul id="tag" class="dropdown-menu filters" data-filter-group="tags">
            <li class="active default"><a href="#" data-filter=""><fmt:message key="jnt_storefilter.label.all"/> </a></li>
            <li role="separator" class="divider"></li>
        </ul>
    </li>
    <li class="dropdown">
        <a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false"><fmt:message key="jnt_storefilter.label.categories"/> <span class="caret"></span></a>
        <ul id="category" class="dropdown-menu filters" data-filter-group="categories">
            <li class="active default"><a href="#" data-filter="">ALL</a></li>
            <li role="separator" class="divider"></li>
        </ul>
    </li>
</ul>