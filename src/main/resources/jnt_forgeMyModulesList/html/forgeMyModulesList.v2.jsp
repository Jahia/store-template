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
<%--<template:include view="hidden.header"/>--%>
<c:set var="publishedCondition" value=""/>
<c:if test="${!jcr:hasPermission(renderContext.site, 'jahiaForgeModerateModule')}">
    <c:set var="publishedCondition" value=" AND [published]=true"/>
</c:if>
<c:set var="columnsNumber" value="${currentNode.properties['columnsNumber'].long}"/>
<c:set var="count" value="1"/>
<template:addResources type="inlinejavascript">
    <script type="text/javascript">
        var tagClasses        = ["label-info", "label-success", "label-warning", "label-danger"];
        var modulesTags       = {};
        var modulesCategories = {};
    </script>
</template:addResources>

<%--Get pakcages--%>
<c:set var="statementPackages"
       value="SELECT * FROM [jnt:content]
                WHERE ISDESCENDANTNODE('${renderContext.site.path}') ${publishedCondition}
                AND ([jcr:primaryType] = 'jnt:forgePackage')
                AND [jcr:createdBy]='${currentUser.username}'
                ORDER BY [jcr:created] DESC"/>
<jcr:sql var="packages" sql="${statementPackages}"/>

<%--Latest modules--%>
<c:set var="latestModules"
       value="SELECT * FROM [jnt:content]
                WHERE ISDESCENDANTNODE('${renderContext.site.path}') ${publishedCondition}
                AND ([jcr:primaryType] = 'jnt:forgeModule')
                AND [jcr:createdBy]='${currentUser.username}'
                ORDER BY [jcr:created] DESC"/>
<jcr:sql var="latest" sql="${latestModules}" limit="3"/>

<%--All modules--%>
<c:set var="allModules"
       value="SELECT * FROM [jnt:content]
                WHERE ISDESCENDANTNODE('${renderContext.site.path}') ${publishedCondition}
                AND ([jcr:primaryType] = 'jnt:forgeModule')
                AND [jcr:createdBy]='${currentUser.username}'
                ORDER BY [jcr:title] ASC"/>
<jcr:sql var="allmodules" sql="${allModules}"/>

<c:set var="latestModulesIds" value=""/>

<h4 style="margin-top: 80px; color: #03a9f4;">JAHIA PACKAGES</h4>

<div class="row">
    <c:forEach items="${packages.nodes}" var="module" varStatus="status" begin="0" end="2">

            <div id="module-${module.identifier}" class="col-lg-4 col-md-6 col-xs-12">
                <template:module node="${module}" view="v2">
                    <template:param value="true" name="showColorTitle"/>
                </template:module>
            </div>
    </c:forEach>
</div>

<h4 style="color: #03a9f4;">LATEST</h4>
<div class="row">
    <c:forEach items="${latest.nodes}" var="module" varStatus="status">
            <c:set var="latestModulesIds" value="${latestModulesIds},${module.identifier}"/>
            <div id="module-${module.identifier}" class="col-lg-4 col-md-6 col-xs-12">
                <template:module node="${module}" view="v2">
                    <template:param value="true" name="showColorTitle"/>
                </template:module>
            </div>
    </c:forEach>
</div>

<c:if test="${functions:length(allmodules.nodes) gt 3}">

    <h4 style="color: #03a9f4;">ALL MODULES TE</h4>

    <div class="row">
        <c:forEach items="${allmodules.nodes}" var="module" varStatus="status">
            <c:if test="${!fn:contains(latestModulesIds, module.identifier)}">
                <div id="module-${module.identifier}" class="col-lg-4 col-md-6 col-xs-12">
                    <template:module node="${module}" view="v2">
                        <template:param value="true" name="showColorTitle"/>
                    </template:module>
                </div>
            </c:if>
        </c:forEach>
    </div>
</c:if>