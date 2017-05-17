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

<c:if test="${isDeveloper && not viewAsUser}">

    <template:addResources type="inlinejavascript">
        <script type="text/javascript">
            function updateReferences(url) {
                $.get(url,{},function(results){
                    window.parent.location.reload(true);
                },"json");
            }

            var moduleVersion;
            $(document).ready(function () {
                moduleVersion = new ModuleVersion();
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

                $('#toggle-changeLog-${currentNode.identifier}').click(function (e) {
                    e.stopPropagation();
                    e.preventDefault();
                    $('#changeLog-${currentNode.identifier}').editable('toggle');
                });
            });

            function ModuleVersion() {
                this.downloadModule = function(url) {
                    window.location.href = url;
                };
            }
        </script>
    </template:addResources>

</c:if>
<c:set var="publishedVal" value="${published.boolean ? 'published' : 'unpublished'}"/>

<div class="container-fluid">
    <div class="row">
        <div class="col-xs-4">
            <h3 class="inline">${versionNumber.string}</h3><div class="inline left-10 ${publishedVal}-tag"><fmt:message key="jnt_forgeEntry.label.module.${publishedVal}"/></div>
        </div>
        <div class="col-xs-8">
            <div class="top-15 float-right">
                <c:if test="${isDeveloper && not viewAsUser}">
                    <button class="btn btn-sm btn-default detailButton"onclick="updateReferences('<c:url value="${url.base}${currentNode.path}.updateReferences.do"/>')">
                        Update References
                    </button>
                </c:if>
                <button class="squareVersionButton btn btn-xs btn-default downloadModuleVersionButton" href="${currentNode.properties.url.string}"
                        onclick="moduleVersion.downloadModule('${currentNode.properties.url.string}')"
                        data-toggle="tooltip" data-placement="top" title="<fmt:message key="jnt_forgeEntry.label.simpleDownload"/>">
                    <span><i class="material-icons downloadVersion">file_download</i></span>
                </button>
                <c:if test="${isDeveloper && not viewAsUser}">
                    <c:url value="${url.base}${currentNode.path}" var="currentNodePath"/>
                    <c:if test="${published.boolean}">
                        <button id="publishVersion-${id}" class="publishVersion circleVersionButton btn btn-xs btn-default unpublishButton"
                                data-value="false" data-target="${currentNodePath}" data-toggle="tooltip"
                                data-placement="top" title="<fmt:message key="jnt_forgeEntry.label.developer.unpublish"/>">
                            <span><i class="rotate-90 top-5 material-icons text-danger">play_circle_outline</i></span>
                        </button>
                    </c:if>
                    <c:if test="${not published.boolean}">
                        <button id="unpublishVersion-${id}" class="publishVersion circleVersionButton btn btn-xs btn-default publishButton"
                                data-value="true" data-target="${currentNodePath}" data-toggle="tooltip"
                                data-placement="top" title="<fmt:message key="jnt_forgeEntry.label.developer.publish"/>">
                            <span><i class="rotate-270 top-5  material-icons text-success">play_circle_outline</i></span>
                        </button>
                    </c:if>
                    <button href="#" class="editChangeLog squareVersionButton btn btn-xs btn-default" data-toggle="tooltip" data-placement="top"
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
                <c:when test="${isDeveloper && not viewAsUser}">
                    ${changeLog.string}
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
                    <span><fmt:formatDate value="${currentNode.properties['jcr:lastModified'].date.time}" pattern="yyyy-MM-dd" /></span>
                </div>
            </footer>
        </div>
    </div>
</div>


