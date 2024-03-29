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
<template:addResources type="css" resources="libraries/fileinput.min.css"/>
<template:addResources type="css" resources="appStore.css"/>
<template:addResources type="css" resources="store_fixes.css"/>
<template:addResources type="javascript" resources="libraries/fileinput/plugins/canvas-to-blob.min.js,
                                                    libraries/fileinput/plugins/sortable.min.js,
                                                    libraries/fileinput/plugins/purify.min.js,
                                                    libraries/fileinput/fileinput.js,
                                                    libraries/fileinput/themes/fa/theme.js,
                                                    libraries/fileinput/locales/${renderContext.mainResourceLocale}.js
                                                    "/>

<c:set var="id" value="${currentNode.identifier}"/>
<jcr:sql
        var="query"
        sql="SELECT * FROM [jnt:forgePackageVersion] AS packageVersion
            WHERE isdescendantnode(packageVersion,['${currentNode.path}'])"
/>
<c:set var="sortedModules" value="${forge:sortByVersion(query.nodes)}"/>
<c:set target="${moduleMap}" property="latestVersion" value="${forge:latestVersion(sortedModules)}"/>
<c:set target="${moduleMap}" property="previousVersions" value="${forge:previousVersions(sortedModules)}"/>
<c:set target="${moduleMap}" property="nextVersions" value="${forge:nextVersions(sortedModules)}"/>
<c:url value='${url.base}${renderContext.site.path}/contents/modules-repository.createEntryFromJar.do'
       var="updateModule"/>
<template:include view="hidden.sql">
    <template:param name="getLatestVersion" value="true"/>
    <template:param name="getPreviousVersions" value="true"/>
</template:include>
<c:set value="${moduleMap.latestVersion}" var="latestVersion"/>
<c:set value="${moduleMap.previousVersions}" var="previousVersions"/>
<c:set value="${moduleMap.nextVersions}" var="nextVersions"/>
<c:if test="${isDeveloper}">
    <template:addResources type="inlinejavascript">
        <script type="text/javascript">
            $(document).ready(function () {
                $("#fileVersion").fileinput({
                    uploadUrl            : "<c:url value='${url.base}${renderContext.site.path}/contents/modules-repository.createEntryFromJar.do'/>", // server upload action
                    uploadAsync          : true,
                    maxFileCount         : 1,
                    showPreview          : false,
                    allowedFileExtensions: ['jar']
                });
            });
        </script>
    </template:addResources>
</c:if>
<div class="row moduleChangeLog" id="moduleChangeLog">
    <div class="col-sm-12">
        <c:choose>
            <c:when test="${empty latestVersion}">
                <div class="alert alert-info">
                    <fmt:message key="jnt_forgeModule.label.developer.emptyChangeLog"/>
                </div>
            </c:when>
        </c:choose>
    </div>
    <div class="col-sm-12">
        <c:if test="${functions:length(previousVersions) > 0}">
            <div class="row previousVersions top-20">
                <c:forEach items="${previousVersions}" var="previousVersion" varStatus="status">
                    <div class="col-sm-12">
                        <c:if test="${status.first}">
                            <h2><fmt:message key="jnt_forgeEntry.label.olderVersions"/></h2>
                        </c:if>
                        <div class="previousVersion">
                            <template:module node="${previousVersion}" view="v3">
                                <template:param name="isDeveloper" value="${isDeveloper}"/>
                                <template:param name="viewAsUser" value="false"/>
                            </template:module>
                        </div>
                    </div>
                </c:forEach>
            </div>
        </c:if>
        <template:addCacheDependency flushOnPathMatchingRegexp="${currentNode.path}/.*"/>
    </div>
</div>