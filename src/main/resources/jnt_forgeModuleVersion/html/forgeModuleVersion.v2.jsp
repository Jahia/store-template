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

                $('#toggle-changeLog-${currentNode.identifier}').click(function (e) {
                    e.stopPropagation();
                    e.preventDefault();
                    $('#changeLog-${currentNode.identifier}').editable('toggle');
                });

            });
        </script>
    </template:addResources>

</c:if>
        <div class="clearfix moduleVersionHeader">

            <div class="pull-left">
                <h3>${versionNumber.string}</h3>
            </div>

            <div class="pull-right">
<c:if test="${isDeveloper && not viewAsUser}">
                <a class="btn btn-small detailButton" href="#" onclick="updateReferences('<c:url value="${url.base}${currentNode.path}.updateReferences.do"/>')">
                    Update References
                </a>
</c:if>
                <a class="btn btn-small detailButton" href="${currentNode.properties.url.string}"
                   onclick="countDownload('<c:url value="${url.base}${currentNode.path}"/>')">
                    <fmt:message key="jnt_forgeEntry.label.downloadVersion">
                        <fmt:param value="${versionNumber.string}"/>
                    </fmt:message>
                </a>

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
        </div>
        <c:if test="${isDeveloper && not viewAsUser}">
            <p class="editable-toggle">
                <a id="toggle-changeLog-${currentNode.identifier}" href="#"><i class="glyphicon glyphicon-pencil"></i>&nbsp;<fmt:message
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