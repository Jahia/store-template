<%@ taglib prefix="jcr" uri="http://www.jahia.org/tags/jcr" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="utility" uri="http://www.jahia.org/tags/utilityLib" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="query" uri="http://www.jahia.org/tags/queryLib" %>
<%@ taglib prefix="functions" uri="http://www.jahia.org/tags/functions" %>
<%@ taglib prefix="forge" uri="http://www.jahia.org/modules/forge/tags" %>
<%--@elvariable id="currentNode" type="org.jahia.services.content.JCRNodeWrapper"--%>
<%--@elvariable id="out" type="java.io.PrintWriter"--%>
<%--@elvariable id="script" type="org.jahia.services.render.scripting.Script"--%>
<%--@elvariable id="scriptInfo" type="java.lang.String"--%>
<%--@elvariable id="workspace" type="java.lang.String"--%>
<%--@elvariable id="renderContext" type="org.jahia.services.render.RenderContext"--%>
<%--@elvariable id="currentResource" type="org.jahia.services.render.Resource"--%>
<%--@elvariable id="currentUser" type="org.jahia.services.usermanager.JahiaUser"--%>
<%--@elvariable id="url" type="org.jahia.services.render.URLGenerator"--%>
<template:addResources type="javascript" resources="libraries/lity.min.js"/>
<template:addResources type="css" resources="libraries/lity.min.css"/>
<c:if test="${currentNode.properties.provider.string eq 'youtube'}">
<div id="videostreaming_${currentNode.identifier}" class="videostreaming">
    <a href="//www.youtube.com/watch?v=${currentNode.properties.identifier.string}" data-lity class="video">
        <span></span>
        <img src="http://img.youtube.com/vi/${currentNode.properties.identifier.string}/0.jpg" />
    </a>
</div>
</c:if>
<c:if test="${currentNode.properties.provider.string eq 'vimeo'}">
    <div id="videostreaming_${currentNode.identifier}" class="videostreaming">
        <a href="//player.vimeo.com/video/${currentNode.properties.identifier.string}" data-lity class="video">
            <span></span>
            <img src="<c:url value='${url.currentModule}/img/video_background.png'/>" />
        </a>
    </div>
</c:if>
<c:if test="${currentNode.properties.provider.string eq 'dailymotion'}">
    <div id="videostreaming_${currentNode.identifier}" class="videostreaming">
        <a href="//dailymotion.com/embed/video/${currentNode.properties.identifier.string}" data-lity class="video">
            <span></span>
            <img src="<c:url value='${url.currentModule}/img/video_background.png'/>" />
        </a>
    </div>
</c:if>
