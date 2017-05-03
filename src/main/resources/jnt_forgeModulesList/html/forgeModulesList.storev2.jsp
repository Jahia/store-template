<%@ taglib prefix="functions" uri="http://www.jahia.org/tags/functions" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="jcr" uri="http://www.jahia.org/tags/jcr" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%@ taglib prefix="forge" uri="http://www.jahia.org/modules/forge/tags" %>
<%--@elvariable id="currentNode" type="org.jahia.services.content.JCRNodeWrapper"--%>
<%--@elvariable id="renderContext" type="org.jahia.services.render.RenderContext"--%>
<%-- Les styles--%>
<template:addResources type="javascript" resources="storeUtils.js"/>
<template:include view="hidden.header"/>
<c:set var="columnsNumber" value="${currentNode.properties['columnsNumber'].long}"/>
<c:set var="count" value="1"/>
<template:addResources type="inlinejavascript">
    <script type="text/javascript">
        var tagClasses = ["label-info", "label-success", "label-warning", "label-danger"];
        var modulesTags = {};
        var modulesCategories = {};
    </script>
</template:addResources>

<div class="row forge" style="position: relative; height: 1000px; margin-top: 100px;">
    <c:forEach items="${moduleMap.currentList}" var="module" varStatus="status" begin="${moduleMap.begin}" end="${moduleMap.end}">
        <c:if test="${module.properties['published'].boolean}">
            <c:set value=" certification-none " var="certification"/>
            <c:choose>
                <c:when test="${module.properties['reviewedByJahia'].boolean and module.properties['supportedByJahia'].boolean}">
                    <c:set var="certification" value=" certification-both  certification-reviewed  certification-supported "/>
                </c:when>
                <c:otherwise>
                    <c:if test="${module.properties['reviewedByJahia'].boolean}"> <c:set var="certification" value=" certification-reviewed "/> </c:if>
                    <c:if test="${module.properties['supportedByJahia'].boolean}"> <c:set var="certification" value=" certification-supported "/> </c:if>
                </c:otherwise>
            </c:choose>
            <c:forEach items="${module.properties['j:defaultCategory']}" var="cat" varStatus="vs">
                <c:set var="categoryIdentifier" value="${cat.string}"/>
                <jcr:node var="category" uuid="${categoryIdentifier}"/>
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
                </script>
            </c:forEach>

            <div id="module-${module.identifier}" class="col-lg-4 col-md-6 col-xs-12 item moduleCard <c:if test="${category != null}">category-${category.identifier}</c:if> ${certification}">
                <template:module node="${module}" view="v2"/>
            </div>
        </c:if>
    </c:forEach>
</div>