/**
 * ==========================================================================================
 * =                            JAHIA'S ENTERPRISE DISTRIBUTION                             =
 * ==========================================================================================
 *
 *                                  http://www.jahia.com
 *
 * JAHIA'S ENTERPRISE DISTRIBUTIONS LICENSING - IMPORTANT INFORMATION
 * ==========================================================================================
 *
 *     Copyright (C) 2002-2017 Jahia Solutions Group. All rights reserved.
 *
 *     This file is part of a Jahia's Enterprise Distribution.
 *
 *     Jahia's Enterprise Distributions must be used in accordance with the terms
 *     contained in the Jahia Solutions Group Terms & Conditions as well as
 *     the Jahia Sustainable Enterprise License (JSEL).
 *
 *     For questions regarding licensing, support, production usage...
 *     please contact our team at sales@jahia.com or go to http://www.jahia.com/license.
 *
 * ==========================================================================================
 */
package org.jahia.modules.forge.actions;

import org.jahia.bin.Action;
import org.jahia.bin.ActionResult;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRSessionWrapper;
import org.jahia.services.render.RenderContext;
import org.jahia.services.render.Resource;
import org.jahia.services.render.URLResolver;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.slf4j.Logger;

import javax.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;


/**
 * Date: 2013-05-17
 *
 * @author Frédéric PIERRE
 * @version 1.0
 */
@Component(service = Action.class)
public class DeleteScreenshot extends Action {

    private static final Logger logger = org.slf4j.LoggerFactory.getLogger(DeleteScreenshot.class);

    @Activate
    public void activate() {
        setName("DeleteScreenshot");
        setRequireAuthenticatedUser(true);
        setRequiredPermission("jcr:write");
        setRequiredMethods("POST");
    }

    @Override
    public ActionResult doExecute(HttpServletRequest req, RenderContext renderContext, Resource resource, JCRSessionWrapper session, Map<String, List<String>> parameters, URLResolver urlResolver) throws Exception {

        JCRNodeWrapper screenshot = resource.getNode();

        // Only allow deleting an actual file/image node that lives directly under a
        // module's (or package's) "screenshots" folder. This prevents the action from
        // being abused to delete arbitrary content that merely happens to sit under a
        // node named "screenshots". jcr:write is enforced by the Spring bean configuration.
        boolean isImageOrFile = screenshot.isNodeType("jnt:file") || screenshot.isNodeType("jmix:image");
        boolean hasValidLocation = "screenshots".equals(screenshot.getParent().getName()) &&
                (screenshot.getParent().getParent().isNodeType("jnt:forgeModule") ||
                        screenshot.getParent().getParent().isNodeType("jnt:forgePackage"));

        if (!isImageOrFile || !hasValidLocation) {
            logger.warn("DeleteScreenshot: node {} is not a valid screenshot - rejected", screenshot.getPath());
            return ActionResult.BAD_REQUEST;
        }

        session.checkout(screenshot);
        logger.info("Screenshot {} has been deleted by user {}", screenshot.getDisplayableName(),
                renderContext.getUser().getUsername());
        screenshot.remove();
        session.save();
        return ActionResult.OK_JSON;
    }
}