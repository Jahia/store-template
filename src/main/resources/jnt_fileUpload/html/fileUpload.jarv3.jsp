<%@ taglib prefix="jcr" uri="http://www.jahia.org/tags/jcr" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="utility" uri="http://www.jahia.org/tags/utilityLib" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="functions" uri="http://www.jahia.org/tags/functions" %>
<%@ taglib prefix="ui" uri="http://www.jahia.org/tags/uiComponentsLib" %>
<%--@elvariable id="currentNode" type="org.jahia.services.content.JCRNodeWrapper"--%>
<%--@elvariable id="propertyDefinition" type="org.jahia.services.content.nodetypes.ExtendedPropertyDefinition"--%>
<%--@elvariable id="type" type="org.jahia.services.content.nodetypes.ExtendedNodeType"--%>
<%--@elvariable id="out" type="java.io.PrintWriter"--%>
<%--@elvariable id="script" type="org.jahia.services.render.scripting.Script"--%>
<%--@elvariable id="scriptInfo" type="java.lang.String"--%>
<%--@elvariable id="workspace" type="java.lang.String"--%>
<%--@elvariable id="renderContext" type="org.jahia.services.render.RenderContext"--%>
<%--@elvariable id="currentResource" type="org.jahia.services.render.Resource"--%>
<%--@elvariable id="url" type="org.jahia.services.render.URLGenerator"--%>

<c:if test="${jcr:hasPermission(renderContext.mainResource.node, 'jahiaForgeUploadModule')}">
    <div class="well well-sm">
        <c:choose>
            <c:when test="${jcr:isNodeType(renderContext.site,'jmix:forgeSettings') and not empty renderContext.site.properties.forgeSettingsUrl.string}">
                <c:set var="linked"
                       value="${ui:getBindedComponent(currentNode, renderContext, 'j:bindedComponent')}"/>
                <c:set var="targetNode" value="${renderContext.mainResource.node}"/>
                <c:if test="${jcr:isNodeType(renderContext.mainResource.node, 'jnt:forgeModule')}">
                    <jcr:node var="targetNode" path="${renderContext.mainResource.node.path}/screenshots"/>
                    <c:set var="isDeveloper"
                           value="${jcr:hasPermission(renderContext.mainResource.node, 'jcr:write')}"/>
                    <c:if test="${isDeveloper}">
                        <c:set var="viewAsUser" value="${not empty param['viewAs'] && param['viewAs'] eq 'user'}"/>
                    </c:if>
                </c:if>


                <c:if test="${!empty currentNode.properties.target}">
                    <c:set var="targetNode" value="${currentNode.properties.target.node}"/>
                </c:if>
                <template:tokenizedForm allowsMultipleSubmits="true">
                    <form class="form-horizontal"
                          action="<c:url value='${url.base}${renderContext.site.path}/contents/modules-repository.createEntryFromJar.do'/>"
                          method="POST" enctype="multipart/form-data">
                        <div class="form-group">
                            <label for="file" class="col-sm-2 control-label"><fmt:message
                                    key="forge.uploadJar.label"/></label>
                            <div class="col-sm-10">
                                <input type="file" name="file" multiple id="file" class="form-control">
                            </div>

                        </div>

                    </form>
                </template:tokenizedForm>
            </c:when>
            <c:otherwise>
                <fmt:message key="forgeSettings.fileUpload.jar.no.settings"/>
            </c:otherwise>
        </c:choose>
    </div>

    <template:addCacheDependency node="${renderContext.site}"/>
</c:if>