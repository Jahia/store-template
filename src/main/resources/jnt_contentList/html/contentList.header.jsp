<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%--@elvariable id="currentNode" type="org.jahia.services.content.JCRNodeWrapper"--%>
<%--@elvariable id="renderContext" type="org.jahia.services.render.RenderContext"--%>
<%-- Les styles--%>
<template:addResources type="css" resources="bootstrap.min.css"/>
<template:addResources type="javascript" resources="jquery.min.js,bootstrap.min.js"/>
<template:addResources type="css" resources="appStore.css"/>
<header <c:if test="${!(renderContext.mainResource.resolvedTemplate eq 'default' or renderContext.mainResource.resolvedTemplate eq 'home')}">class="detail fixed" data-spy="affix" data-offset-top="0"</c:if>>
<c:forEach items="${currentNode.nodes}" var="subchild">
    <template:module node="${subchild}" editable="false"/><%= System.getProperty("line.separator") %>
</c:forEach>
</header>
<c:if test="${renderContext.mainResource.resolvedTemplate eq 'store-module-v2'}">
    <div class="top-color-sep"></div>
</c:if>
