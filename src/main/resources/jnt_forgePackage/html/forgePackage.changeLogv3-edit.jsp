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

<template:addResources type="css" resources="libraries/bootstrap3-wysihtml5.min.css,
                                             libraries/bootstrap-editable.css,
                                             libraries/jqtree.css"/>
<template:addResources type="javascript" resources="libraries/bootstrap-editable.min.js"/>

<template:addResources type="css" resources="libraries/fileinput.min.css"/>
<template:addResources type="css" resources="appStore.css"/>
<template:addResources type="javascript" resources="libraries/fileinput/plugins/canvas-to-blob.min.js,
                                                    libraries/fileinput/plugins/sortable.min.js,
                                                    libraries/fileinput/plugins/purify.min.js,
                                                    libraries/fileinput/fileinput.js,
                                                    libraries/fileinput/themes/fa/theme.js,
                                                    libraries/fileinput/locales/${renderContext.mainResourceLocale}.js
                                                    "/>

<c:set var="id" value="${currentNode.identifier}"/>
<c:set var="isDeveloper" value="${jcr:hasPermission(currentNode, 'jcr:write')}"/>

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
                $('.publishVersion').click(function () {
                    var data                = {};
                    data['published']       = $(this).attr("data-value");
                    data['jcrMethodToCall'] = 'put';
                    $.post($(this).attr("data-target"), data, function () {
                        window.parent.location.reload(true);
                    }, "json");
                });
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
<c:if test="${isDeveloper}">
    <div class="row">
        <div class="col-sm-12">
            <template:tokenizedForm allowsMultipleSubmits="true">
                <form action="<c:url value='${url.base}${renderContext.site.path}/contents/modules-repository.createEntryFromJar.do'/>"
                      method="POST" enctype="multipart/form-data">
                    <label for="fileVersion" class="control-label"><fmt:message
                            key="jnt_forgeModule.uploadNewVersion"/></label>
                    <input type="file" name="file" id="fileVersion" multiple class="file-loading">

                </form>
            </template:tokenizedForm>
        </div>
    </div>
</c:if>
<div class="row" id="moduleChangeLog">
    <div class="col-sm-12">
        <c:if test="${functions:length(nextVersions) > 0 && isDeveloper}">
            <div class="newVersions">
                <c:forEach items="${nextVersions}" var="nextVersion" varStatus="status">
                    <c:if test="${status.first}">
                        <h2><fmt:message key="jnt_forgeEntry.label.newVersions"/></h2>
                        <c:set var="newVersionAvailable" value="true"/>
                    </c:if>
                    <article class="previousVersion">
                        <template:module node="${nextVersion}" view="v3">
                            <template:param name="isLatestVersion" value="false"/>
                            <template:param name="isDeveloper" value="${isDeveloper}"/>
                            <template:param name="viewAsUser" value="false"/>
                        </template:module>
                    </article>
                </c:forEach>
            </div>
        </c:if>
    </div>
    <div class="col-sm-12">
        <c:choose>
            <c:when test="${empty latestVersion && isDeveloper}">
                <div class="alert alert-info">
                    <fmt:message key="jnt_forgeModule.label.developer.emptyChangeLog"/>
                </div>
            </c:when>
            <c:otherwise>
                <div class="newVersions">
                    <h2><fmt:message key="jnt_forgeEntry.label.version"/></h2>

                    <article class="previousVersion">
                        <template:module node="${latestVersion}" view="v3">
                            <template:param name="isLatestVersion" value="true"/>
                            <template:param name="isDeveloper" value="${isDeveloper}"/>
                            <template:param name="viewAsUser" value="false"/>
                        </template:module>
                    </article>
                </div>
            </c:otherwise>
        </c:choose>
    </div>
    <div class="col-sm-12">
        <c:if test="${functions:length(previousVersions) > 0}">
            <div class="row previousVersions top-20">
                <c:if test="${isDeveloper}">
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
                </c:if>
            </div>
        </c:if>
        <template:addCacheDependency flushOnPathMatchingRegexp="${currentNode.path}/.*"/>
    </div>
</div>