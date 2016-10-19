<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="jcr" uri="http://www.jahia.org/tags/jcr" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%--@elvariable id="currentNode" type="org.jahia.services.content.JCRNodeWrapper"--%>
<%--@elvariable id="renderContext" type="org.jahia.services.render.RenderContext"--%>
<%-- Les styles--%>
<template:addResources type="css" resources="appStore.css"/>
<c:set var="lead" value="${currentNode.properties['lead'].string}"/>
<c:set var="title" value="${currentNode.properties['jcr:title'].string}"/>
<c:set var="linkType" value="${currentNode.properties['j:linkType'].string}"/>
<c:set var="linkUrl"/>
<c:choose>
    <c:when test="${linkType == 'internal'}">
        <c:set var="linkNode" value="${currentNode.properties['j:linknode'].node}"/>
        <c:set var="linkTitle" value="${linkNode.displayableName}"/>
        <c:url var="linkUrl" value="${linkNode.url}"/>
    </c:when>
    <c:when test="${linkType == 'external'}">
        <c:set var="linkTitle" value="${currentNode.properties['j:linkTitle'].string}"/>
        <c:if test="${empty linkTitle}">
            <fmt:message var="linkTitle" key="jmix_alink.noTitle"/>
        </c:if>

        <c:set var="linkUrl" value="${currentNode.properties['j:url'].string}"/>
    </c:when>
    <c:otherwise>
        <c:if test="${renderContext.editMode}">
            <div class="alert">
                <strong><fmt:message key="bootstrapAcmeSpaceTemplates.message.warning"/>!</strong> <fmt:message
                    key="bootstrapAcmeSpaceTemplates.couldNotDisplayLink"/> ${linkType}.
            </div>
        </c:if>
    </c:otherwise>
</c:choose>
<c:if test="${empty linkUrl}">
    <c:url var="linkUrl" value="${renderContext.site.home.url}"/>
</c:if>
<div class="jumbotron">
    <a href="${linkUrl}"><h1>${currentNode.properties['title'].string}</h1></a>
</div>