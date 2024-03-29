<%@ taglib prefix="functions" uri="http://www.jahia.org/tags/functions" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="jcr" uri="http://www.jahia.org/tags/jcr" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%--@elvariable id="currentNode" type="org.jahia.services.content.JCRNodeWrapper"--%>
<%--@elvariable id="renderContext" type="org.jahia.services.render.RenderContext"--%>
<template:addResources type="css" resources="bootstrap.min.css"/>
<template:addResources type="css" resources="main.css"/>
<c:set value="${renderContext.site.properties['j:title'].string}" var="title"/>
<jcr:nodeProperty node="${currentNode}" name="j:styleName" var="styleName"/>
<jcr:nodeProperty node="${currentNode}" name="option" var="option"/>
<jcr:nodeProperty node="${currentNode}" name="inverse" var="inverse"/>
<c:set var="navbaritems" value="${jcr:getChildrenOfType(currentNode, 'bootstrap3mix:navBarItem')}"/>
<c:choose>
    <c:when test="${renderContext.editModeConfigName eq 'studiomode'}">
        <ul>
            <c:forEach items="${jcr:getChildrenOfType(currentNode, 'bootstrap3mix:navBarItem')}" var="child"
                       varStatus="searchStatus">
                <template:module node="${child}"/>
            </c:forEach>
            <template:module path="*"/>
        </ul>
    </c:when>
    <c:otherwise>
        <c:set var="navbarClasses" value=" "/>
        <c:if test="${not empty option and not empty option.string}">
            <c:set var="navbarClasses" value="${navbarClasses} ${option.string}"/>
        </c:if>
        <c:if test="${not empty inverse and inverse.boolean}">
            <c:set var="navbarClasses" value="${navbarClasses} navbar-inverse"/>
        </c:if>
        <c:if test="${not empty styleName}">
            <c:set var="navbarClasses" value="${navbarClasses} ${styleName.string}"/>
        </c:if>

        <nav id="filters" class="navbar navbar-default${navbarClasses}" data-offset-top="500">
            <div class="container${currentNode.properties.fluid.boolean ? '-fluid' : ''}">
                <div class="navbar-header">
                    <button type="button" class="navbar-toggle collapsed" data-toggle="collapse"
                            data-target="#navbar-collapse_${currentNode.identifier}" aria-expanded="false" aria-controls="navbar">
                        <span class="sr-only"><fmt:message key="bootstrap3nt_enhancedNavBar.title.toggleNavigation"/></span>
                        <span class="icon-bar"></span>
                        <span class="icon-bar"></span>
                        <span class="icon-bar"></span>
                    </button>
                    <c:choose>
                        <c:when test="${not empty renderContext.site.home.url}">
                            <c:url var="siteUrl" value="${renderContext.site.home.url}" context="/"/>
                        </c:when>
                        <c:otherwise>
                            <c:set var="siteUrl" value="#"/>
                        </c:otherwise>
                    </c:choose>
                </div>
                <div id="navbar-collapse_${currentNode.identifier}" class="navbar-collapse collapse">
                    <c:forEach items="${navbaritems}" var="child"
                               varStatus="searchStatus">
                        <template:module node="${child}"/>
                    </c:forEach>
                </div>
            </div>
        </nav>
    </c:otherwise>
</c:choose>