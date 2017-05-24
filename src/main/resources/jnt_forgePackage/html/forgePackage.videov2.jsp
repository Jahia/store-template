<%@ taglib prefix="jcr" uri="http://www.jahia.org/tags/jcr" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="utility" uri="http://www.jahia.org/tags/utilityLib" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="functions" uri="http://www.jahia.org/tags/functions" %>
<%@ taglib prefix="user" uri="http://www.jahia.org/tags/user" %>
<%@ taglib prefix="query" uri="http://www.jahia.org/tags/queryLib" %>
<%--@elvariable id="currentNode" type="org.jahia.services.content.JCRNodeWrapper"--%>
<%--@elvariable id="out" type="java.io.PrintWriter"--%>
<%--@elvariable id="script" type="org.jahia.services.render.scripting.Script"--%>
<%--@elvariable id="scriptInfo" type="java.lang.String"--%>
<%--@elvariable id="workspace" type="java.lang.String"--%>
<%--@elvariable id="renderContext" type="org.jahia.services.render.RenderContext"--%>
<%--@elvariable id="currentResource" type="org.jahia.services.render.Resource"--%>
<%--@elvariable id="currentUser" type="org.jahia.services.usermanager.JahiaUser"--%>
<%--@elvariable id="url" type="org.jahia.services.render.URLGenerator"--%>


<c:url value='${url.base}${currentNode.path}.${hasVideoNode ? "editVideo" : "addVideo"}.do' var="actionUrl"/>
<c:set var="id" value="${currentNode.identifier}"/>
<c:set var="isDeveloper" value="${jcr:hasPermission(currentNode, 'jcr:write')}"/>
<c:if test="${isDeveloper}">
    <c:set var="viewAsUser" value="${not empty param['viewAs'] && param['viewAs'] eq 'user'}" />
</c:if>
<c:set var="hasVideoNode" value="${jcr:hasChildrenOfType(currentNode, 'jnt:videostreaming')}"/>
<c:set var="isEmptyTab" value="false"/>

<c:if test="${hasVideoNode}">
    <jcr:node var="videoNode" path="${currentNode.path}/video"/>
    <c:set var="videoProvider" value="${videoNode.properties['provider'].string}"/>
    <c:set var="videoIdentifier" value="${videoNode.properties['identifier'].string}"/>
    <c:set var="videoHeight" value="${videoNode.properties['height'].string}"/>
    <c:set var="videoWidth" value="${videoNode.properties['width'].string}"/>
    <c:set var="videoAllowfullscreen" value="${videoNode.properties['allowfullscreen'].string}"/>
</c:if>

<c:if test="${(not isDeveloper || viewAsUser)
                    && (not hasVideoNode
                        || (empty videoProvider || fn:trim(videoProvider) eq '')
                        || (empty videoIdentifier || fn:trim(videoIdentifier) eq ''))}">

    <c:set var="isEmptyTab" value="true"/>
</c:if>

<c:if test="${isDeveloper && not viewAsUser}">
    <template:addResources type="inlinejavascript">

        <script type="text/javascript">
            <c:if test="${hasVideoNode}">
                function removeVideo(){
                    $.post('<c:url value="${url.base}${videoNode.path}"/>',{jcrMethodToCall: 'delete'}, function() {
                        $('#editVideos').modal('toggle');
                        window.location = '${fn:replace(currentNode.url,".html",".store-module-v2-edit.html")}';
                    }, "json");
                }
            </c:if>

        </script>

    </template:addResources>
</c:if>

<c:choose>
    <c:when test="${hasVideoNode}">
        <p>
            <a id="remove-video-${id}" href="#" onclick="removeVideo()"><fmt:message key="jnt_forgeEntry.label.remove"/> : ${videoProvider} - ${videoIdentifier}&nbsp;<i class="glyphicon glyphicon-remove"></i></a>
        </p>
    </c:when>
    <c:otherwise>
        <template:tokenizedForm>
            <form class="videoForm" id="forgeModuleVideoForm-${id}" action="${actionUrl}" method="post">
                <input type="hidden" name="jcrRedirectTo"
                       value="<c:url value='${url.base}${currentNode.path}.store-module-v2-edit'/>"/>

                <fieldset>

                    <div class="form-group">
                        <label class="control-label" for="provider"><fmt:message key="jnt_forgeEntry.label.videoProvider"/></label>
                        <select name="provider" id="provider" class="form-control">
                            <option value="youtube" ${videoProvider eq 'youtube' ? 'selected' : ''}>youtube</option>
                            <option value="dailymotion" ${videoProvider eq 'dailymotion' ? 'selected' : ''}>dailymotion</option>
                            <option value="vimeo" ${videoProvider eq 'vimeo' ? 'selected' : ''}>vimeo</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="control-label" for="identifier"><fmt:message key="jnt_forgeEntry.label.videoIdentifier"/></label>
                        <input placeholder="<fmt:message key="jnt_forgeEntry.label.videoIdentifier" />" type="text"
                               name="identifier" id="identifier" value="${videoIdentifier}" class="form-control"/>
                    </div>

                    <div class="form-group">
                        <input type="submit" class="btn btn-primary" value="<fmt:message key="jnt_forgeEntry.label.submit"/>"/>
                    </div>

                </fieldset>
            </form>
        </template:tokenizedForm>
    </c:otherwise>
</c:choose>