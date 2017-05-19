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

<c:if test="${isDeveloper}">

    <template:addResources type="inlinejavascript">
        <script type="text/javascript">
            function updateReferences(url) {
                $.get(url, {}, function (results) {
                    window.parent.location.reload(true);
                }, "json");
            }

            function toggleChangeLog(id) {
                $("#changeLogView-"+id).toggle();
                $("#changeLogEdition-"+id).toggle();
            }
        </script>
    </template:addResources>

</c:if>
<c:set var="publishedVal" value="${published.boolean ? 'published' : 'unpublished'}"/>

<div class="container-fluid">
    <div class="row">
        <div class="col-xs-4">
            <h3 class="inline">${versionNumber.string}</h3>
            <div class="inline left-10 ${publishedVal}-tag"><fmt:message
                    key="jnt_forgeEntry.label.module.${publishedVal}"/></div>
        </div>
        <div class="col-xs-8">
            <div class="top-15 float-right">
                <c:if test="${isDeveloper}">
                    <button class="btn btn-xs btn-default circleVersionButton downloadModuleVersionButton"
                            onclick="updateReferences('<c:url
                                    value="${url.base}${currentNode.path}.updateReferences.do"/>')">
                        <span><i class="material-icons downloadVersion">link</i></span>
                    </button>
                </c:if>
                <c:set var="versionFile" value="${jcr:getChildrenOfType(currentNode, 'jnt:file')}"/>
                <c:forEach items="${versionFile}" var="file" varStatus="status">
                    <a class="squareVersionButton btn btn-xs btn-default downloadModuleVersionButton"
                       href="<c:url value="${url.context}${url.files}${file.path}" context="/"/>" download="${fn:substringAfter(currentNode.properties.url.string, '/')}"
                       data-toggle="tooltip" data-placement="top"
                       title="<fmt:message key="jnt_forgeEntry.label.simpleDownload"/>">
                        <span><i class="material-icons downloadVersion">file_download</i></span>
                    </a>
                </c:forEach>
                <c:if test="${isDeveloper}">
                    <c:url value="${url.base}${currentNode.path}" var="currentNodePath"/>
                    <c:if test="${published.boolean}">
                        <button id="publishVersion-${id}"
                                class="publishVersion circleVersionButton btn btn-xs btn-default unpublishButton"
                                data-value="false" data-target="${currentNodePath}" data-toggle="tooltip"
                                data-placement="top"
                                title="<fmt:message key="jnt_forgeEntry.label.developer.unpublish"/>">
                            <span><i class="rotate-90 top-5 material-icons text-danger">play_circle_outline</i></span>
                        </button>
                    </c:if>
                    <c:if test="${not published.boolean}">
                        <button id="unpublishVersion-${id}"
                                class="publishVersion circleVersionButton btn btn-xs btn-default publishButton"
                                data-value="true" data-target="${currentNodePath}" data-toggle="tooltip"
                                data-placement="top"
                                title="<fmt:message key="jnt_forgeEntry.label.developer.publish"/>">
                            <span><i
                                    class="rotate-270 top-5  material-icons text-success">play_circle_outline</i></span>
                        </button>
                    </c:if>
                    <button class="editChangeLog squareVersionButton btn btn-xs btn-default" data-toggle="tooltip"
                            data-placement="top" onclick="toggleChangeLog('${id}')"
                            title="<fmt:message key="jnt_forgeEntry.label.editChangeLog"/>">
                        <i class="material-icons edit-changelog-icon">edit</i>
                    </button>
                </c:if>
            </div>
        </div>
    </div>
    <br/>
    <div class="row">
        <div class="col-xs-12">
            <c:choose>
                <c:when test="${isDeveloper}">
                    <div id="changeLogView-${id}" class="changeLogView">
                            ${changeLog.string}
                    </div>
                    <div id="changeLogEdition-${id}" class="changeLogEdition" style="display: none">
                        <form class="form-horizontal" style="margin-top: 15px"
                              action="<c:url value='${url.base}${currentNode.path}'/>"
                              method="post">
                            <input type="hidden" name="jcrMethodToCall" value="PUT"/>
                            <input type="hidden" name="jcrRedirectTo"
                                   value="<c:url value='${url.base}${currentNode.parent.path}.store-module-v2-edit'/>"/>
                            <div class="form-group">
                                <label for="changeLog"
                                       class="control-label col-sm-2">Edit changelog for version ${versionNumber.string}</label>
                                <div class="col-sm-10">
                                            <textarea class="ckarea form-control" name="changeLog"
                                                      id="changeLog-${id}" rows="5" cols="60">
                                                <c:out value="${changeLog.string}"/>
                                            </textarea>
                                </div>
                            </div>
                            <button type="submit" class="btn btn-warning">Save changelog for version ${versionNumber.string}</button>
                        </form>
                    </div>
                </c:when>
                <c:otherwise>
                    ${changeLog.string}
                </c:otherwise>
            </c:choose>
        </div>
        <div class="col-xs-12">
            <footer class="versionFooter">
                <div class="inline">
                    <span>
                        <strong><fmt:message key="jnt_forgeEntry.label.relatedJahiaVersion"/></strong>
                    </span>
                    <span>
                        ${requiredVersion.node.displayableName}
                    </span> <strong>&nbsp;-&nbsp;</strong>
                    <span><strong><fmt:message key="jnt_forgeEntry.label.updated"/></strong></span>
                    <span><fmt:formatDate value="${currentNode.properties['jcr:lastModified'].date.time}"
                                          pattern="yyyy-MM-dd"/></span>
                </div>
            </footer>
        </div>
    </div>
</div>


