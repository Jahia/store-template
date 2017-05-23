<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="functions" uri="http://www.jahia.org/tags/functions" %>
<%@ taglib prefix="jcr" uri="http://www.jahia.org/tags/jcr" %>
<%@ taglib prefix="s" uri="http://www.jahia.org/tags/search" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%@ taglib prefix="utility" uri="http://www.jahia.org/tags/utilityLib" %>
<%@page import="java.lang.System"%>
<%--@elvariable id="currentNode" type="org.jahia.services.content.JCRNodeWrapper"--%>
<%--@elvariable id="out" type="java.io.PrintWriter"--%>
<%--@elvariable id="script" type="org.jahia.services.render.scripting.Script"--%>
<%--@elvariable id="scriptInfo" type="java.lang.String"--%>
<%--@elvariable id="workspace" type="java.lang.String"--%>
<%--@elvariable id="renderContext" type="org.jahia.services.render.RenderContext"--%>
<%--@elvariable id="currentResource" type="org.jahia.services.render.Resource"--%>
<%--@elvariable id="url" type="org.jahia.services.render.URLGenerator"--%>
<template:addResources type="css" resources="searchresults.css"/>
<c:set var="columnsNumber" value="3"/>
<c:set var="count" value="1"/>

<template:addResources type="inlinejavascript">
    <script type="text/javascript">
        var modulesStatus = {};
        var modulesTags = {};
        var modulesCategories = {};
        var tagCountMap = {};
    </script>
</template:addResources>

<script>
    $(document).ready(function(){
        $(document).trigger('updateFooterPosition');
    })
</script>

<c:if test="${renderContext.editMode}">
    <fieldset>
    <legend>${fn:escapeXml(jcr:label(currentNode.primaryNodeType,currentResource.locale))}</legend>
</c:if>
<c:set var="hitsName" value="hits_${currentNode.identifier}"/>
<c:set var="hitsCountName" value="hitsCount_${currentNode.identifier}"/>
<c:choose>
    <c:when test='${searchMap[hitsName] eq null}'>
        <s:results var="resultsHits" approxCountVar="listApproxSize">
            <c:set target="${moduleMap}" property="listTotalSize" value="${count}" />
            <c:set target="${moduleMap}" property="resultsHits" value="${resultsHits}" />
            <c:set target="${moduleMap}" property="listApproxSize" value="${listApproxSize}" />
            <c:if test='${searchMap == null}'>
                <jsp:useBean id="searchMap" class="java.util.HashMap" scope="request"/>
            </c:if>
            <c:set target="${searchMap}" property="${hitsName}" value="${resultsHits}"/>
            <c:set target="${searchMap}" property="${hitsCountName}" value="${count}"/>
            <c:set target="${searchMap}" property="listApproxSize" value="${listApproxSize}" />
        </s:results>
    </c:when>
    <c:otherwise>
        <c:set target="${moduleMap}" property="listTotalSize" value="${searchMap[hitsCountName]}" />
        <c:set target="${moduleMap}" property="resultsHits" value="${searchMap[hitsName]}" />
        <c:set target="${moduleMap}" property="listApproxSize" value="${searchMap[listApproxSize]}" />
    </c:otherwise>
</c:choose>

<jcr:nodeProperty name="jcr:title" node="${currentNode}" var="title"/>
<jcr:nodeProperty name="autoSuggest" node="${currentNode}" var="autoSuggest"/>
<div class="row">
    <div class="col-md-12">
        <ul class="filter-info list-inline"></ul>
    </div>
</div>
<div id="${currentNode.UUID}">
    <div class="resultsList">
        <c:if test="${param.autoSuggest != false && autoSuggest.boolean && (empty moduleMap || empty moduleMap.begin || moduleMap.begin == 0)}">
            <%-- spelling auto suggestions are enabled --%>
            <jcr:nodeProperty name="autoSuggestMinimumHitCount" node="${currentNode}" var="autoSuggestMinimumHitCount"/>
            <jcr:nodeProperty name="autoSuggestHitCount" node="${currentNode}" var="autoSuggestHitCount"/>
            <jcr:nodeProperty name="autoSuggestMaxTermCount" node="${currentNode}" var="autoSuggestMaxTermCount"/>
            <c:if test="${moduleMap['listTotalSize'] <= functions:default(autoSuggestMinimumHitCount.long, 2)}">
                <%-- the number of original results is less than the configured threshold, we can start auto-suggest  --%>
                <s:suggestions runQuery="${autoSuggestHitCount.long > 0}" maxTermsToSuggest="${autoSuggestMaxTermCount.long}">
                    <%-- we have a suggestion --%>
                    <c:if test="${autoSuggestHitCount.long > 0 && suggestedCount > moduleMap['listTotalSize']}">
                        <%-- found more hits for the suggestion than the original query brings --%>
                        <h4>
                            <fmt:message key="search.results.didYouMean" />:&nbsp;
                            <c:forEach var="suggestion" items="${suggestion.allSuggestions}" varStatus="status">
                                <a href="<s:suggestedSearchUrl suggestion="${suggestion}"/>"><em>${fn:escapeXml(suggestion)}</em></a>
                                <c:if test="${not status.last}">, </c:if>
                            </c:forEach>
                            <br/><fmt:message key="search.results.didYouMean.topResults"><fmt:param value="${functions:min(functions:default(autoSuggestHitCount.long, 2), suggestedCount)}" /></fmt:message>
                        </h4>
                        <ol>
                            <s:resultIterator begin="0" end="${functions:default(autoSuggestHitCount.long, 2) - 1}">
                                <li><%@ include file="searchHit.store.jspf" %></li>
                            </s:resultIterator>
                        </ol>
                        <hr/>
                        <h4><fmt:message key="search.results.didYouMean.resultsFor"/>:&nbsp;<strong>${fn:escapeXml(suggestion.originalQuery)}</strong></h4>
                    </c:if>
                    <c:if test="${autoSuggestHitCount.long == 0}">
                        <h4>
                            <fmt:message key="search.results.didYouMean" />:&nbsp;
                            <c:forEach var="suggestion" items="${suggestion.allSuggestions}" varStatus="status">
                                <a href="<s:suggestedSearchUrl suggestion="${suggestion}"/>"><em>${fn:escapeXml(suggestion)}</em></a>
                                <c:if test="${not status.last}">, </c:if>
                            </c:forEach>
                        </h4>
                    </c:if>
                </s:suggestions>
            </c:if>
        </c:if>
        <c:if test="${searchMap['listApproxSize'] > 0 || moduleMap['listTotalSize'] > 0}">
            <c:set var="termKey" value="src_terms[0].term"/>
            <c:if test="${searchMap['listApproxSize'] eq 2147483647 || (searchMap['listApproxSize'] eq 0 && moduleMap['listTotalSize'] eq 2147483647)}">
                <h3><fmt:message key="search.results.sizeNotExact.found"><fmt:param value="${fn:escapeXml(param[termKey])}"/><fmt:param value="more"/></fmt:message></h3>
            </c:if>
            <c:if test="${searchMap['listApproxSize'] > 0 && searchMap['listApproxSize'] < 2147483647 || moduleMap['listTotalSize'] < 2147483647}">
                <c:set var="messKey" value="jnt_searchResults.label.searchResults" />
                <c:if test="${searchMap['listApproxSize'] > 0}">
                    <c:set var="messKey" value="search.results.sizeNotExact.found" />
                </c:if>
                <h3><fmt:message key="${messKey}"/><span class="searchResultsCount"></span></h3>
            </c:if>
            <c:set var="beginName" value="begin_${currentNode.identifier}"/>
            <c:set var="endName" value="end_${currentNode.identifier}"/>
            <c:if test="${not empty requestScope[beginName]}">
                <c:set target="${moduleMap}" property="begin" value="${requestScope[beginName]}"/>
            </c:if>
            <c:if test="${not empty requestScope[endName]}">
                <c:set target="${moduleMap}" property="end" value="${requestScope[endName]}"/>
            </c:if>
            <div class="row forge" style="position: relative; height: 1000px;">
                <div class="category-grid">
                    <s:resultIterator begin="${moduleMap.begin}" end="${moduleMap.end}" varStatus="status" hits="${moduleMap['resultsHits']}">
                        <c:set var="module" value="${hit.rawHit}"></c:set>
                        <!-- add status to status map -->
                        <c:if test="${not empty module.properties['status'].string}">
                            <script type="text/javascript">
                                modulesStatus['${module.properties['status'].string}'] = "${module.properties['status'].string}".substring(0,1).toUpperCase() + "${module.properties['status'].string}".substring(1);
                            </script>
                        </c:if>
                        <c:set var="categories" value=""/>
                        <!--Set module categories for filtering purposes-->
                        <c:forEach items="${module.properties['j:defaultCategory']}" var="cat" varStatus="vs">
                            <c:set var="categoryIdentifier" value="${cat.string}"/>
                            <jcr:node var="category" uuid="${categoryIdentifier}"/>
                            <c:set var='categories' value='${categories}${not vs.first ? " " : ""}${cat.node.identifier}' />
                        </c:forEach>
                        <!--Set module tags for filtering purposes-->
                        <c:set var="moduleTags" value=""/>
                        <c:forEach items="${module.properties['j:tagList']}" var="moduleTag" varStatus="tagStatus">
                            <c:set var='moduleTags' value='${moduleTags}${not tagStatus.first ? " " : ""}${moduleTag.string}' />
                        </c:forEach>
                        <script type="text/javascript">
                            modulesTags['${module.identifier}']=[];
                            <c:if test="${category != null}">
                            modulesCategories['${category.properties['jcr:title'].string}']="${category.identifier}";
                            </c:if>
                        </script>
                        <!-- save current module tags in javascript object for the filters !-->
                        <c:forEach items="${module.properties['j:tagList']}" var="currentTag" varStatus="moduleStatus">
                            <script type="text/javascript">
                                modulesTags['${module.identifier}'].push('${currentTag.string}');
                                tagCountMap['${currentTag.string}'] = tagCountMap['${currentTag.string}'] ? tagCountMap['${currentTag.string}'] + 1 : 1;
                            </script>
                        </c:forEach>
                        <div class="grid-sizer col-lg-4 col-md-6 col-xs-12"></div>
                        <div class="col-lg-4 col-md-6 col-xs-12 moduleCard"
                             data-filter-status="${module.properties['status'].string} all"
                             data-filter-categories="${categories} all"
                             data-filter-tags="${moduleTags}">
                            <div id="module-${module.identifier}">
                                <template:module node="${module}" view="v2"/>
                            </div>
                        </div>
                    </s:resultIterator>
                </div>
            </div>
        </c:if>
        <c:if test="${moduleMap['listTotalSize'] == 0}">
            <h4><fmt:message key="search.results.no.results"/></h4>
        </c:if>
    </div>
</div>

<c:if test="${renderContext.editMode}">
    </fieldset>
</c:if>