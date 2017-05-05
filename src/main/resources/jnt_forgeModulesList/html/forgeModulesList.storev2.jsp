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
<template:addCacheDependency flushOnPathMatchingRegexp="${renderContext.site.path}/contents/modules-repository/.*"/>
<template:addResources type="javascript" resources="storeUtils.js"/>
<template:include view="hidden.header"/>

<%--Get pakcages--%>
<c:set var="statementPackages"
       value="SELECT * FROM [jnt:content]
                WHERE ISDESCENDANTNODE('${renderContext.site.path}') AND [published]=true
                AND ([jcr:primaryType] = 'jnt:forgePackage')
                ORDER BY [jcr:created] DESC"/>
<jcr:sql var="packages" sql="${statementPackages}"/>

<%--Latest modules--%>
<c:set var="latestModules"
       value="SELECT * FROM [jnt:content]
                WHERE ISDESCENDANTNODE('${renderContext.site.path}') AND [published]=true
                AND ([jcr:primaryType] = 'jnt:forgeModule')
                ORDER BY [jcr:created] DESC"/>
<jcr:sql var="latest" sql="${latestModules}" limit="3"/>

<%--All modules--%>
<c:set var="allModules"
       value="SELECT * FROM [jnt:content]
                WHERE ISDESCENDANTNODE('${renderContext.site.path}') AND [published]=true
                AND ([jcr:primaryType] = 'jnt:forgeModule')
                ORDER BY [jcr:title] ASC"/>
<jcr:sql var="allmodules" sql="${allModules}"/>

<c:set var="latestModulesIds" value="" />

<div class="row">
    <h4 style="color: #03a9f4;">JAHIA PACKAGES</h4>
    <c:forEach items="${packages.nodes}" var="module" varStatus="status" begin="0" end="2">
        <c:if test="${module.properties['published'].boolean}">
            <div id="module-${module.identifier}" class="col-lg-4 col-md-6 col-xs-12">
                <template:module node="${module}" view="v2"/>
            </div>
        </c:if>
    </c:forEach>
</div>

<c:if test="${not empty latest.nodes}">
    <div class="row">
        <h4 style="color: #03a9f4;">LATEST</h4>
        <c:forEach items="${latest.nodes}" var="module" varStatus="status">
            <c:if test="${module.properties['published'].boolean}">
                <c:set var="latestModulesIds" value="${latestModulesIds},${module.identifier}" />
                <div id="module-${module.identifier}" class="col-lg-4 col-md-6 col-xs-12">
                    <template:module node="${module}" view="v2"/>
                </div>
            </c:if>
        </c:forEach>
    </div>
</c:if>

<c:if test="${not empty allmodules.nodes}">
    <div class="row">
        <h4 style="color: #03a9f4;">ALL MODULES</h4>
        <c:forEach items="${allmodules.nodes}" var="module" varStatus="status">
            <c:if test="${module.properties['published'].boolean and !fn:contains(latestModulesIds, module.identifier)}">
                <div id="module-${module.identifier}" class="col-lg-4 col-md-6 col-xs-12">
                    <template:module node="${module}" view="v2"/>
                </div>
            </c:if>
        </c:forEach>
    </div>
</c:if>