<%@ taglib prefix="jcr" uri="http://www.jahia.org/tags/jcr" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="utility" uri="http://www.jahia.org/tags/utilityLib" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="functions" uri="http://www.jahia.org/tags/functions" %>
<%@ taglib prefix="user" uri="http://www.jahia.org/tags/user" %>
<%@ taglib prefix="query" uri="http://www.jahia.org/tags/queryLib" %>
<%--@elvariable id="currentNode" type="org.jahia.services.content.JCRNodeWrapper"--%>
<%--@elvariable id="out" type="java.io.PrintWriter"--%>
<%--@elvariable id="script" type="org.jahia.services.render.scripting.Script"--%>
<%--@elvariable id="scriptInfo" type="java.lang.String"--%>
<%--@elvariable id="workspace" type="java.lang.String"--%>
<%--@elvariable id="renderContext" type="org.jahia.services.render.RenderContext"--%>
<%--@elvariable id="currentResource" type="org.jahia.services.render.Resource"--%>
<%--@elvariable id="currentUser" type="org.jahia.services.usermanager.JahiaUser"--%>
<%--@elvariable id="url" type="org.jahia.services.render.URLGenerator"--%>
<c:set var="isAdminPage" value="${renderContext.mainResource.resolvedTemplate eq 'my-modules'}"/>
<c:set var="id" value="${currentNode.identifier}"/>
<c:set var="title" value="${currentNode.properties['jcr:title'].string}"/>
<jcr:node var="iconFolder" path="${currentNode.path}/icon" />
<c:forEach var="iconItem" items="${iconFolder.nodes}">
    <c:set var="icon" value="${iconItem}"/>
</c:forEach>
<c:set var="description" value="${currentNode.properties['description'].string}"/>
<%@include file="../../commons/authorName.jspf"%>

<c:url value="${currentNode.url}" context="/" var="moduleUrl"/>

<c:set var="worstRating" value="1"/>
<c:set var="bestRating" value="5"/>
<c:set var="ratingNbr" value="${fn:length(jcr:getNodes(currentNode, 'jnt:review'))}"/>
<jcr:node var="reviews" path="${currentNode.path}/reviews"/>
<c:set var="entireRating" value="0"/>
<c:if test="${reviews != null}">
    <c:set var="ratingTotal" value="0"/>
    <c:set var="ratingCount" value="0"/>
    <c:forEach var="review" items="${reviews.nodes}">
        <c:set var="ratingCount" value="${ratingCount+1}"/>
        <c:set var="ratingTotal" value="${ratingTotal+review.properties['rating'].long}"/>
    </c:forEach>
    <c:if test="${ratingCount > 0}">
        <c:set var="averageRating" value="${fn:replace(ratingTotal/ratingCount,',','.')}"/>
        <c:set var="splittedAverage" value="${fn:split(averageRating, '.')}"/>
        <c:set var="entireRating" value="${splittedAverage[0]}"/>
        <c:if test="${fn:length(splittedAverage)>1}">
            <c:set var="firstDigit" value="${fn:substring(splittedAverage[1],0,1)}"/>
            <c:if test="${firstDigit ge 5}">
                <c:set var="entireRating" value="${entireRating+1}"/>
            </c:if>
        </c:if>
    </c:if>
</c:if>
<fmt:message key="jnt_forgeEntry.status.community" var="communityLabel"/>
<fmt:message key="jnt_forgeEntry.status.labs" var="labsLabel"/>
<fmt:message key="jnt_forgeEntry.status.prereleased" var="prereleasedLabel"/>
<fmt:message key="jnt_forgeEntry.status.supported" var="supportedLabel"/>
<c:set var="moduleStatus" value="${not empty currentNode.properties['status'].string?currentNode.properties['status'].string:'community'}"/>
<c:set var="moduleStatusLabel" value="${communityLabel}"/>
<c:set var="labelClass" value="label-warning"/>
<c:if test="${moduleStatus eq 'labs'}">
    <c:set var="moduleStatusLabel" value="${labsLabel}"/>
</c:if>
<c:if test="${moduleStatus eq 'prereleased'}">
    <c:set var="moduleStatusLabel" value="${prereleasedLabel}"/>
</c:if>
<c:if test="${moduleStatus eq 'supported' or currentNode.properties['supportedByJahia'].boolean}">
    <c:set var="moduleStatusLabel" value="${supportedLabel}"/>
    <c:set var="moduleStatus" value="supported"/>
    <c:set var="labelClass" value="label-success"/>
</c:if>
<c:if test="${currentNode.properties['published'].boolean or isAdminPage}">
    <div class="media" data-href="${moduleUrl}" style="cursor: pointer; <c:if test="${isAdminPage}">height:180px;  border: 1px solid grey;</c:if>" onclick='window.location.replace("${moduleUrl}");'>
        <div class="media-left">
            <c:url var="iconUrl" value="${url.currentModule}/img/icon.png"/>
            <a href="${moduleUrl}">
                <img class="moduleIcon" src="${not empty icon.url ? icon.url : iconUrl}"
                     alt="<fmt:message key="jnt_forgeEntry.label.moduleIcon"><fmt:param value="${title}"/></fmt:message>"/>
            </a>
        </div>
        <div class="media-body">
            <h4 class="media-heading">${title}</h4>
            <div class="author">${authorName}</div>
            <div>
                <span data-toggle="tooltip" title="${moduleStatusLabel}" class="label ${labelClass} badge-jahiaStatus"><c:if test="${moduleStatus eq 'supported' or currentNodde.properties['supportedByJahia'].boolean}"><i class="glyphicon glyphicon-ok" style="color:white;"></i>&nbsp;</c:if> ${moduleStatusLabel}</span>
            </div>
            <div class="rating">
                <c:forEach var="i" begin="${worstRating}" end="${bestRating}">
                    <c:choose>
                        <c:when test="${entireRating ge i}">
                            &#9733;
                        </c:when>
                        <c:otherwise>
                            &#9734;
                        </c:otherwise>
                    </c:choose>
                </c:forEach>
            </div>
        </div>
        <div class="hide">
                ${currentNode.properties['description'].string}<br/>
                ${currentNode.properties['howToInstall'].string}<br/>
            <c:forEach items="${currentNode.properties['j:tagList']}" var="currentTag" varStatus="moduleStatus">
                ${currentTag.string}<br/>
            </c:forEach>
        </div>
    </div>
</c:if>
