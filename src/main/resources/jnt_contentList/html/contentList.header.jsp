<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%--@elvariable id="currentNode" type="org.jahia.services.content.JCRNodeWrapper"--%>
<%--@elvariable id="renderContext" type="org.jahia.services.render.RenderContext"--%>
<%-- Les styles--%>
<c:set var="isHomePage" value="${renderContext.mainResource.node.identifier eq renderContext.site.home.identifier or renderContext.mainResource.resolvedTemplate eq 'my-modules' or renderContext.mainResource.resolvedTemplate eq 'store-admin'}"/>
<c:set var="isSearchResultPage" value="${(renderContext.mainResource.node.primaryNodeType.name eq 'jnt:page') and (renderContext.mainResource.node.name eq 'search-results')}"/>
<c:set var="isAdminPage" value="${renderContext.mainResource.resolvedTemplate eq 'store-admin'}"/>
<c:if test="${isHomePage or isSearchResultPage}">
    <template:addResources type="javascript" resources="libraries/isotope.min.js"/>
</c:if>
<template:addResources type="css" resources="appStore.css"/>
<template:addResources type="javascript" resources="libraries/storeUtils.js"/>
<header
        <c:choose>
            <c:when test="${isHomePage or isSearchResultPage}">
                class="home"
            </c:when>
            <c:otherwise>
                class="detail fixed <c:if test="${isAdminPage}">admin-header</c:if>" data-offset-top="0"
            </c:otherwise>
        </c:choose>
>
    <c:forEach items="${currentNode.nodes}" var="subchild">
        <template:module node="${subchild}" editable="false"/>
    </c:forEach>
</header>
<%--<c:if test="${!(isHomePage or isSearchResultPage)}">--%>
    <%--<div class="top-color-sep"></div>--%>
<%--</c:if>--%>
<c:if test="${moduleMap.editable and renderContext.editMode}">
    <template:module path="*"/>
</c:if>
