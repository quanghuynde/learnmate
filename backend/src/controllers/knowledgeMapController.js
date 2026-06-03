const KnowledgeMap = require('../models/KnowledgeMap');
const Document = require('../models/Document');

const COLORS = ['bg-slate-200', 'bg-blue-100', 'bg-emerald-100', 'bg-purple-100', 'bg-orange-100', 'bg-pink-100'];
const SIZES = ['w-40 h-40', 'w-36 h-36', 'w-32 h-32', 'w-28 h-28'];

const normalizeDocs = (documents) => {
  return documents.map((doc, index) => {
    const itemsPerRow = 3;
    const row = Math.floor(index / itemsPerRow);
    const col = index % itemsPerRow;
    const x = Math.min(92, 10 + col * 38);
    const y = Math.min(92, 20 + row * 24);

    return {
      id: doc._id.toString(),
      label: doc.name || 'Tài liệu',
      x,
      y,
      color: COLORS[index % COLORS.length],
      size: SIZES[index % SIZES.length],
    };
  });
};

const buildConnections = (nodes) => {
  const connections = [];
  for (let i = 1; i < nodes.length; i += 1) {
    connections.push({ from: nodes[i - 1].id, to: nodes[i].id });
  }
  return connections;
};

const buildCrossLinks = (nodes) => {
  if (nodes.length < 3) return [];
  return nodes
    .filter((_, index) => index % 2 === 0 && index + 2 < nodes.length)
    .map((node, index) => ({ from: node.id, to: nodes[index + 2].id }));
};

const createInsight = (documents) => {
  const subjects = new Set(
    documents.flatMap((doc) => doc.topics || []).map((topic) => topic.toLowerCase())
  );
  if (documents.length === 1) {
    return 'Thêm tài liệu để tạo mạng tri thức phong phú hơn.';
  }
  return `Bản đồ được xây dựng từ ${documents.length} tài liệu. Chú ý điều chỉnh vị trí để dễ thấy các liên kết quan trọng giữa các nội dung.`;
};

const getKnowledgeMaps = async (req, res) => {
  try {
    const maps = await KnowledgeMap.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ knowledgeMaps: maps });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createKnowledgeMap = async (req, res) => {
  try {
    const { documentIds } = req.body;
    if (!Array.isArray(documentIds) || documentIds.length < 2) {
      return res.status(400).json({ message: 'Cần chọn ít nhất 2 tài liệu để tạo bản đồ' });
    }

    const documents = await Document.find({ _id: { $in: documentIds }, user: req.user.id });
    if (documents.length !== documentIds.length) {
      return res.status(400).json({ message: 'Một số tài liệu không tồn tại hoặc không thuộc người dùng' });
    }

    const nodes = normalizeDocs(documents);
    const connections = buildConnections(nodes);
    const crossLinks = buildCrossLinks(nodes);
    const aiInsight = createInsight(documents);

    const map = await KnowledgeMap.create({
      user: req.user.id,
      documentIds,
      nodes,
      connections,
      crossLinks,
      aiInsight,
    });

    res.status(201).json({ knowledgeMap: map });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const regenerateKnowledgeMap = async (req, res) => {
  try {
    const map = await KnowledgeMap.findOne({ _id: req.params.id, user: req.user.id });
    if (!map) return res.status(404).json({ message: 'Không tìm thấy bản đồ' });

    const documents = await Document.find({ _id: { $in: map.documentIds }, user: req.user.id });
    if (!documents.length) return res.status(400).json({ message: 'Tài liệu liên kết không tồn tại' });

    const nodes = normalizeDocs(documents);
    map.nodes = nodes;
    map.connections = buildConnections(nodes);
    map.crossLinks = buildCrossLinks(nodes);
    map.aiInsight = createInsight(documents);
    await map.save();

    res.json({ knowledgeMap: map });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateKnowledgeMap = async (req, res) => {
  try {
    const map = await KnowledgeMap.findOne({ _id: req.params.id, user: req.user.id });
    if (!map) return res.status(404).json({ message: 'Không tìm thấy bản đồ' });

    const allowedFields = ['nodes', 'connections', 'crossLinks', 'aiInsight'];
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        map[key] = req.body[key];
      }
    }

    await map.save();
    res.json({ knowledgeMap: map });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getKnowledgeMaps,
  createKnowledgeMap,
  regenerateKnowledgeMap,
  updateKnowledgeMap,
};
