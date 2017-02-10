<%@ taglib prefix="functions" uri="http://www.jahia.org/tags/functions" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="jcr" uri="http://www.jahia.org/tags/jcr" %>
<%@ taglib prefix="s" uri="http://www.jahia.org/tags/search" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<template:addResources type="css" resources="main.css"/>
<template:addCacheDependency uuid="${currentNode.properties.result.string}"/>
<c:if test="${not empty currentNode.properties.result.node}">
    <c:url value='${url.base}${currentNode.properties.result.node.path}.html' var="searchUrl"/>
    <jcr:nodeProperty node="${currentNode}" name="position" var="position"/>
    <c:set var="pullClass" value="" />
    <c:if test="${not empty position}">
        <c:set var="pullClass" value=" navbar-${position.string}" />
    </c:if>
    <s:form method="post" class="navbar-form navbar-left ${pullClass}" action="${searchUrl}" role="search" id="search" >
        <i class="fa fa-search"></i>
        <div class="form-group">
            <c:set var="searchPath" value="${renderContext.site.path}"/>
            <fmt:message key='bootstrap3nt_navBarSimpleSearchForm.label.search' var="placeholder"/>
            <s:term match="all_words" id="searchTerm" searchIn="content,siteContent,tags,files"
                    class="form-control input-lg quicksearch search-query" placeholder="${placeholder}" />
            <s:pagePath value="${searchPath}" display="false" includeChildren="true" />
            <s:site value="${renderContext.site.name}" includeReferencesFrom="systemsite"  display="false" />
            <s:language value="${renderContext.mainResource.locale}" display="false" />
            <s:nodeType value="jmix:forgeElement" selectionOptions="jmix:forgeElement,jnt:forgeModule,jnt:forgePackage" display="false" />
            <s:nodeProperty nodeType="jnt:forgeModule" name="published" value="true" display="false"/>
            <s:nodeProperty nodeType="jnt:forgePackage" name="published" value="true" display="false"/>
        </div>
    </s:form>
</c:if>