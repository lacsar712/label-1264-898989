const { DataTypes } = require('sequelize');

const { sequelize } = require('../config/database');

const User = require('./user')(sequelize, DataTypes);
const UserTag = require('./userTag')(sequelize, DataTypes);
const Resource = require('./resource')(sequelize, DataTypes);
const ResourceCategory = require('./resourceCategory')(sequelize, DataTypes);
const ResourceTag = require('./resourceTag')(sequelize, DataTypes);
const RecommendationBatch = require('./recommendationBatch')(sequelize, DataTypes);
const Recommendation = require('./recommendation')(sequelize, DataTypes);
const UserResource = require('./userResource')(sequelize, DataTypes);
const LearningDaily = require('./learningDaily')(sequelize, DataTypes);
const LearningGoal = require('./learningGoal')(sequelize, DataTypes);
const WrongQuestion = require('./wrongQuestion')(sequelize, DataTypes);
const UserBehavior = require('./userBehavior')(sequelize, DataTypes);
const RecommendationRule = require('./recommendationRule')(sequelize, DataTypes);
const SystemParam = require('./systemParam')(sequelize, DataTypes);
const SystemLog = require('./systemLog')(sequelize, DataTypes);

User.hasMany(UserTag, { foreignKey: 'userId', as: 'tags' });
UserTag.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Resource.hasMany(ResourceTag, { foreignKey: 'resourceId', as: 'tags' });
ResourceTag.belongsTo(Resource, { foreignKey: 'resourceId', as: 'resource' });

User.hasMany(RecommendationBatch, { foreignKey: 'userId', as: 'recommendationBatches' });
RecommendationBatch.belongsTo(User, { foreignKey: 'userId', as: 'user' });

RecommendationBatch.hasMany(Recommendation, { foreignKey: 'batchId', as: 'recommendations' });
Recommendation.belongsTo(RecommendationBatch, { foreignKey: 'batchId', as: 'batch' });

User.hasMany(Recommendation, { foreignKey: 'userId', as: 'recommendations' });
Recommendation.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Resource.hasMany(Recommendation, { foreignKey: 'resourceId', as: 'recommendations' });
Recommendation.belongsTo(Resource, { foreignKey: 'resourceId', as: 'resource' });

User.hasMany(UserResource, { foreignKey: 'userId', as: 'userResources' });
UserResource.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Resource.hasMany(UserResource, { foreignKey: 'resourceId', as: 'userResources' });
UserResource.belongsTo(Resource, { foreignKey: 'resourceId', as: 'resource' });

User.hasMany(LearningDaily, { foreignKey: 'userId', as: 'learningDaily' });
LearningDaily.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(LearningGoal, { foreignKey: 'userId', as: 'goals' });
LearningGoal.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(WrongQuestion, { foreignKey: 'userId', as: 'wrongQuestions' });
WrongQuestion.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(UserBehavior, { foreignKey: 'userId', as: 'behaviors' });
UserBehavior.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Resource.hasMany(UserBehavior, { foreignKey: 'resourceId', as: 'behaviors' });
UserBehavior.belongsTo(Resource, { foreignKey: 'resourceId', as: 'resource' });

User.hasMany(SystemLog, { foreignKey: 'actorUserId', as: 'logs' });
SystemLog.belongsTo(User, { foreignKey: 'actorUserId', as: 'actor' });

module.exports = {
  sequelize,
  User,
  UserTag,
  Resource,
  ResourceCategory,
  ResourceTag,
  RecommendationBatch,
  Recommendation,
  UserResource,
  LearningDaily,
  LearningGoal,
  WrongQuestion,
  UserBehavior,
  RecommendationRule,
  SystemParam,
  SystemLog,
};
