const Project = require('../models/Project');
const Channel = require('../models/Channel');
const { logActivity } = require('../services/activityService');

exports.createProject = async (req, res) => {
    try {
        const { role } = req.user;
        if (!['admin', 'manager', 'hr'].includes(role)) {
            return res.status(403).json({ success: false, message: 'Unauthorized. Only Admins, Managers or HR can create projects.' });
        }
        const { name, description, deadline, members } = req.body;
        const companyId = req.user.companyId;
        const createdBy = req.user.id;

        // Ensure creator is in the members list
        const projectMembers = members || [];
        if (!projectMembers.includes(createdBy)) {
            projectMembers.push(createdBy);
        }

        const project = await Project.create({
            name, description, deadline, members: projectMembers, companyId, createdBy
        });

        await logActivity({
            action: 'Project Created',
            details: `Project "${name}" was launched.`,
            userId: createdBy,
            companyId,
            referenceId: project._id,
            referenceType: 'Project'
        });

        res.status(201).json({ success: true, project });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error creating project', error: error.message });
    }
};

exports.getProjects = async (req, res) => {
    try {
        const { companyId, id: userId, role } = req.user;
        let query = { companyId };
        
        // Admins see everything. Others see Public projects OR those they are members of.
        if (role !== 'admin') {
            query.$or = [
                { type: 'public' },
                { members: userId }
            ];
        }

        const projects = await Project.find(query).populate('members', 'name role');
        res.json({ success: true, projects });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching projects', error: error.message });
    }
};

exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, members } = req.body;

    const updatedProject = await Project.findByIdAndUpdate(
      id,
      { name, type, members },
      { new: true }
    ).populate("members", "name email");

    if (!updatedProject) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    res.status(200).json({
      success: true,
      message: "Project updated successfully",
      data: updatedProject,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedProject = await Project.findByIdAndDelete(id);

    if (!deletedProject) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    // Optional: Delete or unlink channels associated with this project
    // await Channel.deleteMany({ projectId: id }); 

    res.status(200).json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProjectDetails = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id).populate('members', 'name role');
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
        
        const channels = await Channel.find({ projectId: project._id });
        res.json({ success: true, project, channels });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching project details', error: error.message });
    }
};
