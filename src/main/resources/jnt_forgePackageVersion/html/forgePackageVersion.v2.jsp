<%@ taglib prefix="jcr" uri="http://www.jahia.org/tags/jcr" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="utility" uri="http://www.jahia.org/tags/utilityLib" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="query" uri="http://www.jahia.org/tags/queryLib" %>
<%@ taglib prefix="functions" uri="http://www.jahia.org/tags/functions" %>
<%--@elvariable id="currentNode" type="org.jahia.services.content.JCRNodeWrapper"--%>
<%--@elvariable id="out" type="java.io.PrintWriter"--%>
<%--@elvariable id="script" type="org.jahia.services.render.scripting.Script"--%>
<%--@elvariable id="scriptInfo" type="java.lang.String"--%>
<%--@elvariable id="workspace" type="java.lang.String"--%>
<%--@elvariable id="renderContext" type="org.jahia.services.render.RenderContext"--%>
<%--@elvariable id="currentResource" type="org.jahia.services.render.Resource"--%>
<%--@elvariable id="currentUser" type="org.jahia.services.usermanager.JahiaUser"--%>
<%--@elvariable id="url" type="org.jahia.services.render.URLGenerator"--%>
<c:set var="id" value="${currentNode.identifier}"/>
<jcr:nodeProperty node="${currentNode}" name="changeLog" var="changeLog"/>
<jcr:nodeProperty node="${currentNode}" name="versionNumber" var="versionNumber"/>
<jcr:nodeProperty node="${currentNode}" name="requiredVersion" var="requiredVersion"/>
<jcr:nodeProperty node="${currentNode}" name="published" var="published"/>
<template:include view="versionHidden.sql"/>


<c:if test="${isDeveloper && not viewAsUser}">

    <template:addResources type="inlinejavascript">
        <script type="text/javascript">

            $(document).ready(function () {

                <c:url var="postURL" value="${url.base}${currentNode.path}"/>
                $('#changeLog-${currentNode.identifier}').editable({
                    <jsp:include page="../../commons/bootstrap-editable-options-wysihtml5.jsp">
                    <jsp:param name="postURL" value='${postURL}'/>
                    <jsp:param name="fullEditor" value='false'/>
                    </jsp:include>
                });

                $('#toggle-changeLog-${currentNode.identifier}').click(function (e) {
                    e.stopPropagation();
                    e.preventDefault();
                    $('#changeLog-${currentNode.identifier}').editable('toggle');
                });

            });
        </script>
    </template:addResources>

</c:if>

<header class="clearfix moduleVersionHeader">

    <div class="pull-left">
        <h3>${versionNumber.string}</h3>
    </div>

    <div class="pull-right">
        <c:set var="versionFiles" value="${jcr:getChildrenOfType(currentNode, 'jnt:file')}"/>
        <c:forEach items="${versionFiles}" var="file" varStatus="status">
            <a class="btn btn-small detailButton" href="${url.context}${url.files}${file.path}"
               onclick="countDownload('<c:url value="${url.base}${currentNode.path}"/>')">
                <fmt:message key="jnt_forgeEntry.label.downloadVersion">
                    <fmt:param value="${versionNumber.string}"/>
                </fmt:message>
            </a>
        </c:forEach>

        <c:if test="${isDeveloper && not viewAsUser}">
            <c:url value="${url.base}${currentNode.path}" var="currentNodePath"/>
            <c:if test="${published.boolean}">
                <button id="publishVersion-${id}" class="btn btn-small publishVersion btn-success"
                        data-value="false" data-target="${currentNodePath}">
                    <fmt:message key="jnt_forgeEntry.label.developer.unpublish"/>
                </button>
            </c:if>
            <c:if test="${not published.boolean}">
                <button id="unpublishVersion-${id}" class="btn btn-small publishVersion btn-danger"
                        data-value="true" data-target="${currentNodePath}">
                    <fmt:message key="jnt_forgeEntry.label.developer.publish"/>
                </button>
            </c:if>

        </c:if>

    </div>
</header>

<c:if test="${isDeveloper && not viewAsUser}">
    <p class="editable-toggle">
        <a id="toggle-changeLog-${currentNode.identifier}" href="#"><i class="icon-pencil"></i>&nbsp;<fmt:message
                key="jnt_forgeEntry.label.edit"/></a>
    </p>
    <div data-original-title="<fmt:message
        key="jnt_forgeEntryVersion.label.changeLog"/>" data-toggle="manual" data-name="changeLog" data-type="wysihtml5"
    data-pk="1" id="changeLog-${currentNode.identifier}" class="editable">
</c:if>

${changeLog.string}

<c:if test="${isDeveloper && not viewAsUser}">
    </div>
</c:if>

<h2><fmt:message key="jnt_forgeEntry.modulesList"/></h2>

<table cellpadding="0" cellspacing="0" border="0" class="table table-hover table-bordered" id="modules_table">
    <thead>
    <tr>
        <th><fmt:message key="jnt_forgeEntry.label.moduleName"/></th>
        <th><fmt:message key="jnt_forgeEntry.label.moduleVersion"/></th>
    </tr>
    </thead>
    <tbody>
    <c:forEach items="${moduleMap.submodules}" var="submodule">
        <tr>
            <td>${submodule.properties['moduleName'].string}</td>
            <td>${submodule.properties['moduleVersion'].string}</td>
        </tr>
    </c:forEach>
    </tbody>
</table>

<footer>
    <dl class="inline">
        <dt><fmt:message key="jnt_forgeEntry.label.relatedJahiaVersion"/></dt>
        <dd>
            ${requiredVersion.node.displayableName}
        </dd>
        <dt><fmt:message key="jnt_forgeEntry.label.updated"/></dt>
        <dd><fmt:formatDate value="${currentNode.properties['jcr:lastModified'].date.time}" pattern="yyyy-MM-dd" /></dd>
    </dl>
</footer>

