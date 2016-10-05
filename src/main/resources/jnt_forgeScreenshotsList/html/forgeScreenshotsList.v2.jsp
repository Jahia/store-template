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
<template:addResources type="css" resources="appStore.css"/>
<template:addResources type="inlinejavascript">
    <script type="text/javascript">

        $(document).ready(function() {
            //appstoreV2
            $('#screenshotsCarousel-${id}').carousel();
        });

    </script>
</template:addResources>
<c:set var="pictures" value="${jcr:getChildrenOfType(currentNode, 'jmix:image')}"/>
<c:if test="${!empty pictures}">
    <div id="screenshotsCarousel-${id}" class="pictureCarousel carousel slide">
        <ol class="carousel-indicators">
            <c:forEach var="moduleScreenshot" items="${pictures}" varStatus="status">
                <li data-target="#screenshotsCarousel-${id}" data-slide-to="${status.index}" class="${status.first ? 'active' : ''}"></li>
            </c:forEach>
        </ol>
        <div class="carousel-inner">
            <c:forEach var="moduleScreenshot" items="${pictures}" varStatus="status">
                <div class="${status.first ? 'active ' : ''}item">
                    <template:module node="${moduleScreenshot}" view="${moduleMap.subNodesView}" editable="${moduleMap.editable}"/>
                </div>
            </c:forEach>
        </div>
        <a class="moduleImageControl carousel-control left" href="#screenshotsCarousel-${id}" data-slide="prev">&lsaquo;</a>
        <a class="moduleImageControl carousel-control right" href="#screenshotsCarousel-${id}" data-slide="next">&rsaquo;</a>
    </div>
</c:if>