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
            <%-- spelling auto suggestions are enabled --%>
            <jcr:nodeProperty name="autoSuggestMinimumHitCount" node="${currentNode}" var="autoSuggestMinimumHitCount"/>
            <jcr:nodeProperty name="autoSuggestHitCount" node="${currentNode}" var="autoSuggestHitCount"/>
            <jcr:nodeProperty name="autoSuggestMaxTermCount" node="${currentNode}" var="autoSuggestMaxTermCount"/>
                <%-- the number of original results is less than the configured threshold, we can start auto-suggest  --%>
                <s:suggestions maxTermsToSuggest="${autoSuggestMaxTermCount.long}">
                        <%-- found more hits for the suggestion than the original query brings --%>
                        <h5>
                            <fmt:message key="search.results.didYouMean" />:&nbsp;

                            <c:forEach var="suggestion" items="${suggestion.allSuggestions}" varStatus="status">
                                <c:if test="${status.first}">
                                    <c:set var="firstSuggestion" value="${suggestion}"/>
                                </c:if>
                                <a href="<s:suggestedSearchUrl suggestion="${suggestion}"/>"><em>${fn:escapeXml(suggestion)}</em></a>
                                <c:if test="${not status.last}">, </c:if>
                            </c:forEach>
                            <span class="small">
                            <c:if test="${moduleMap['listTotalSize'] gt 0}"><fmt:message key="search.results.didYouMean.expectedResults"><fmt:param value="${functions:length(suggestedHits)}"/></fmt:message></c:if>
                            </span>
                        </h5>
                    <c:if test="${moduleMap['listTotalSize'] eq 0}">
                        <h4><fmt:message key="search.results.didYouMean.results"><fmt:param value="${functions:length(suggestedHits)}"/><fmt:param value="${firstSuggestion}"/></fmt:message></h4>
                        <div class="row forge filter-grid-container" style="position: relative; height: 1000px;">
                        <div class="filter-grid">
                            <s:resultIterator>
                                <%--Include card rendering--%>
                                <%@include file="searchHit.store.jspf"%>
                            </s:resultIterator>
                        </div>
                        </div>
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

        <c:if test="${searchMap['listApproxSize'] > 0 || moduleMap['listTotalSize'] > 0}">
            <c:set var="termKey" value="src_terms[0].term"/>
            <c:if test="${searchMap['listApproxSize'] eq 2147483647 || (searchMap['listApproxSize'] eq 0 && moduleMap['listTotalSize'] eq 2147483647)}">
                <h4><fmt:message key="search.results.sizeNotExact.found"><fmt:param value="${fn:escapeXml(param[termKey])}"/><fmt:param value="more"/></fmt:message></h4>
            </c:if>
            <c:if test="${searchMap['listApproxSize'] > 0 && searchMap['listApproxSize'] < 2147483647 || moduleMap['listTotalSize'] < 2147483647}">
                <c:set var="messKey" value="jnt_searchResults.label.searchResults" />
                <c:if test="${searchMap['listApproxSize'] > 0}">
                    <c:set var="messKey" value="search.results.sizeNotExact.found" />
                </c:if>
                <h4><fmt:message key="${messKey}"/>&nbsp;<span class="label label-info searchResultsCount"></span></h4>
            </c:if>
            <c:set var="beginName" value="begin_${currentNode.identifier}"/>
            <c:set var="endName" value="end_${currentNode.identifier}"/>
            <c:if test="${not empty requestScope[beginName]}">
                <c:set target="${moduleMap}" property="begin" value="${requestScope[beginName]}"/>
            </c:if>
            <c:if test="${not empty requestScope[endName]}">
                <c:set target="${moduleMap}" property="end" value="${requestScope[endName]}"/>
            </c:if>
            <div class="row forge filter-grid-container" style="position: relative; height: 1000px;">
                <div class="filter-grid">
                    <s:resultIterator begin="${moduleMap.begin}" end="${moduleMap.end}" varStatus="status" hits="${moduleMap['resultsHits']}">
                        <%--Include card rendering--%>
                        <%@include file="searchHit.store.jspf"%>
                    </s:resultIterator>
                </div>
            </div>
        </c:if>
        <c:if test="${moduleMap['listTotalSize'] == 0}">
            <h4><fmt:message key="jnt_searchResults.label.searchResults"/>&nbsp;<span class="label label-info">0</span></h4>
        </c:if>
    </div>
</div>

<c:if test="${renderContext.editMode}">
    </fieldset>
</c:if>