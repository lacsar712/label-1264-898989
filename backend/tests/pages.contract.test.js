require('dotenv').config();

const request = require('supertest');
const jwt = require('jsonwebtoken');

const app = require('../src/app');
const { User, sequelize } = require('../src/models');
const { waitForDb } = require('../src/utils/waitForDb');

function isString(v) {
  return typeof v === 'string';
}

function isNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function isBoolean(v) {
  return typeof v === 'boolean';
}

function isArray(v) {
  return Array.isArray(v);
}

function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function isDateOrString(v) {
  if (v === null || v === undefined) return true;
  if (v instanceof Date) return true;
  if (isString(v)) return true;
  return false;
}

function expectShape(actual, shape, path = '') {
  for (const key of Object.keys(shape)) {
    const fullPath = path ? `${path}.${key}` : key;
    const rule = shape[key];
    const value = actual?.[key];

    if (rule.required && value === undefined) {
      throw new Error(`Missing required field: ${fullPath}`);
    }

    if (value === undefined || value === null) continue;

    if (rule.type) {
      let ok = false;
      switch (rule.type) {
        case 'string':
          ok = isString(value);
          break;
        case 'number':
          ok = isNumber(value);
          break;
        case 'boolean':
          ok = isBoolean(value);
          break;
        case 'array':
          ok = isArray(value);
          break;
        case 'object':
          ok = isObject(value);
          break;
        case 'date':
          ok = isDateOrString(value);
          break;
        default:
          ok = true;
      }
      if (!ok) {
        throw new Error(`Type mismatch at ${fullPath}: expected ${rule.type}, got ${typeof value}`);
      }
    }

    if (rule.shape && isObject(value)) {
      expectShape(value, rule.shape, fullPath);
    }

    if (rule.items && isArray(value)) {
      for (let i = 0; i < value.length; i += 1) {
        const itemPath = `${fullPath}[${i}]`;
        const item = value[i];
        if (rule.items.shape && isObject(item)) {
          expectShape(item, rule.items.shape, itemPath);
        } else if (rule.items.type) {
          let ok = false;
          switch (rule.items.type) {
            case 'string':
              ok = isString(item);
              break;
            case 'number':
              ok = isNumber(item);
              break;
            case 'boolean':
              ok = isBoolean(item);
              break;
            case 'object':
              ok = isObject(item);
              break;
            default:
              ok = true;
          }
          if (!ok) {
            throw new Error(`Type mismatch at ${itemPath}: expected ${rule.items.type}, got ${typeof item}`);
          }
        }
      }
    }
  }
}

const BASE_RESPONSE_SHAPE = {
  ok: { required: true, type: 'boolean' },
  data: { required: true, type: 'object' },
};

const PAGE_SCHEMAS = {
  '/api/pages/home': {
    user: {
      required: true,
      type: 'object',
      shape: {
        name: { required: true, type: 'string' },
        stage: { required: true, type: 'string' },
        learningStyle: { required: false, type: 'string' },
        subjectPreference: { required: true, type: 'array', items: { type: 'string' } },
      },
    },
    profileDonut: {
      required: true,
      type: 'array',
      items: {
        shape: {
          name: { required: true, type: 'string' },
          value: { required: true, type: 'number' },
        },
      },
    },
    profileTable: {
      required: true,
      type: 'array',
      items: {
        shape: {
          name: { required: true, type: 'string' },
          weight: { required: true, type: 'number' },
          updatedAt: { required: true, type: 'date' },
        },
      },
    },
    recommendTrend7d: {
      required: true,
      type: 'array',
      items: {
        shape: {
          date: { required: true, type: 'string' },
          clickCount: { required: true, type: 'number' },
          completionRate: { required: true, type: 'number' },
        },
      },
    },
    recommendTable: {
      required: true,
      type: 'array',
      items: {
        shape: {
          recommendationId: { required: true, type: 'number' },
          resourceId: { required: false, type: 'string' },
          name: { required: false, type: 'string' },
          type: { required: false, type: 'string' },
          adaptedTags: { required: true, type: 'array', items: { type: 'string' } },
          matchScore: { required: true, type: 'number' },
        },
      },
    },
    quickStats: {
      required: true,
      type: 'object',
      shape: {
        totalStudyMinutes7d: { required: true, type: 'number' },
        completedResources7d: { required: true, type: 'number' },
        avgRecommendMatch7d: { required: true, type: 'number' },
        pomodoroCount7d: { required: true, type: 'number' },
        focusMinutes7d: { required: true, type: 'number' },
      },
    },
    weeklySummaryTable: {
      required: true,
      type: 'array',
      items: {
        shape: {
          date: { required: true, type: 'string' },
          studyMinutes: { required: true, type: 'number' },
          completedCount: { required: true, type: 'number' },
          avgMatchScore: { required: true, type: 'number' },
        },
      },
    },
    pomodoroDaily: {
      required: true,
      type: 'array',
      items: {
        shape: {
          date: { required: true, type: 'string' },
          count: { required: true, type: 'number' },
          focusMinutes: { required: true, type: 'number' },
        },
      },
    },
  },

  '/api/pages/resources': {
    resourceCategoryStacked: {
      required: true,
      type: 'array',
      items: {
        shape: {
          subject: { required: true, type: 'string' },
          课程: { required: false, type: 'number' },
          课件: { required: false, type: 'number' },
          题库: { required: false, type: 'number' },
          视频: { required: false, type: 'number' },
        },
      },
    },
    searchTable: {
      required: true,
      type: 'array',
      items: {
        shape: {
          id: { required: true, type: 'number' },
          resourceId: { required: true, type: 'string' },
          name: { required: true, type: 'string' },
          subject: { required: true, type: 'string' },
          type: { required: true, type: 'string' },
          difficulty: { required: true, type: 'string' },
          heat: { required: true, type: 'number' },
          rating: { required: true, type: 'number' },
          estimatedHours: { required: true, type: 'number' },
          tags: { required: true, type: 'array', items: { type: 'string' } },
          updatedAt: { required: true, type: 'date' },
        },
      },
    },
    tagWordCloud: {
      required: true,
      type: 'array',
      items: {
        shape: {
          name: { required: true, type: 'string' },
          value: { required: true, type: 'number' },
        },
      },
    },
    tagPie: {
      required: true,
      type: 'array',
      items: {
        shape: {
          name: { required: true, type: 'string' },
          value: { required: true, type: 'number' },
        },
      },
    },
    tagRelationTable: {
      required: true,
      type: 'array',
      items: {
        shape: {
          tagName: { required: true, type: 'string' },
          resourceCount: { required: true, type: 'number' },
          stage: { required: true, type: 'string' },
          recommendWeight: { required: true, type: 'number' },
        },
      },
    },
    favoriteCompletionTrend7d: {
      required: true,
      type: 'array',
      items: {
        shape: {
          date: { required: true, type: 'string' },
          completionRate: { required: true, type: 'number' },
        },
      },
    },
    favoriteTable: {
      required: true,
      type: 'array',
      items: {
        shape: {
          id: { required: true, type: 'number' },
          name: { required: false, type: 'string' },
          favoritedAt: { required: false, type: 'date' },
          progressPercent: { required: false, type: 'number' },
          status: { required: true, type: 'string' },
          folderId: { required: true, type: 'number' },
        },
      },
    },
    favoriteFolders: {
      required: true,
      type: 'array',
      items: {
        shape: {
          id: { required: true, type: 'number' },
          name: { required: true, type: 'string' },
          isDefault: { required: true, type: 'boolean' },
          parentId: { required: false, type: 'number' },
          sortOrder: { required: true, type: 'number' },
        },
      },
    },
    favoriteGroups: {
      required: true,
      type: 'array',
      items: {
        shape: {
          id: { required: true, type: 'number' },
          name: { required: true, type: 'string' },
          isDefault: { required: true, type: 'boolean' },
          parentId: { required: false, type: 'number' },
          sortOrder: { required: true, type: 'number' },
          resourceCount: { required: true, type: 'number' },
          items: { required: true, type: 'array' },
        },
      },
    },
  },

  '/api/pages/recommendation-analysis': {
    radar: {
      required: true,
      type: 'array',
      items: {
        shape: {
          name: { required: true, type: 'string' },
          value: { required: true, type: 'number' },
        },
      },
    },
    dimensionTable: {
      required: true,
      type: 'array',
      items: {
        shape: {
          name: { required: true, type: 'string' },
          score: { required: true, type: 'number' },
          weight: { required: true, type: 'number' },
          suggestion: { required: true, type: 'string' },
        },
      },
    },
    strategyFlow: {
      required: true,
      type: 'object',
      shape: {
        nodes: {
          required: true,
          type: 'array',
          items: {
            shape: {
              id: { required: true, type: 'string' },
              name: { required: true, type: 'string' },
              x: { required: true, type: 'number' },
              y: { required: true, type: 'number' },
              desc: { required: true, type: 'string' },
            },
          },
        },
        edges: {
          required: true,
          type: 'array',
          items: {
            shape: {
              source: { required: true, type: 'string' },
              target: { required: true, type: 'string' },
            },
          },
        },
      },
    },
    strategySankey: {
      required: true,
      type: 'object',
      shape: {
        nodes: {
          required: true,
          type: 'array',
          items: {
            shape: {
              name: { required: true, type: 'string' },
            },
          },
        },
        links: {
          required: true,
          type: 'array',
          items: {
            shape: {
              source: { required: true, type: 'string' },
              target: { required: true, type: 'string' },
              value: { required: true, type: 'number' },
            },
          },
        },
      },
    },
    ruleTable: {
      required: true,
      type: 'array',
      items: {
        shape: {
          ruleId: { required: true, type: 'string' },
          name: { required: true, type: 'string' },
          matchDimensions: { required: true, type: 'array', items: { type: 'string' } },
          weightRatio: { required: true, type: 'array' },
          enabled: { required: true, type: 'boolean' },
        },
      },
    },
    effectTrend: {
      required: true,
      type: 'array',
      items: {
        shape: {
          batch: { required: true, type: 'string' },
          clickCount: { required: true, type: 'number' },
          completionRate: { required: true, type: 'number' },
          retentionRate: { required: true, type: 'number' },
        },
      },
    },
    effectTable: {
      required: true,
      type: 'array',
      items: {
        shape: {
          batch: { required: false, type: 'string' },
          resourceCount: { required: true, type: 'number' },
          clickCount: { required: true, type: 'number' },
          completeCount: { required: true, type: 'number' },
          completionRate: { required: true, type: 'number' },
          reviewNote: { required: false, type: 'string' },
        },
      },
    },
  },

  '/api/pages/progress': {
    subjectPie: {
      required: true,
      type: 'array',
      items: {
        shape: {
          name: { required: true, type: 'string' },
          value: { required: true, type: 'number' },
        },
      },
    },
    overviewTable: {
      required: true,
      type: 'array',
      items: {
        shape: {
          subject: { required: true, type: 'string' },
          totalStudyMinutes: { required: true, type: 'number' },
          completedResources: { required: true, type: 'number' },
          wrongCount: { required: true, type: 'number' },
          masteryRate: { required: true, type: 'number' },
        },
      },
    },
    progressTrend30d: {
      required: true,
      type: 'array',
      items: {
        shape: {
          date: { required: true, type: 'string' },
          actualMinutes: { required: true, type: 'number' },
          targetMinutes: { required: true, type: 'number' },
        },
      },
    },
    dailyTable: {
      required: true,
      type: 'array',
      items: {
        shape: {
          date: { required: true, type: 'string' },
          subject: { required: true, type: 'string' },
          studyMinutes: { required: true, type: 'number' },
          completedCount: { required: true, type: 'number' },
          targetAchieveRate: { required: true, type: 'number' },
          note: { required: false, type: 'string' },
        },
      },
    },
    wrongFunnel: {
      required: true,
      type: 'array',
      items: {
        shape: {
          name: { required: true, type: 'string' },
          value: { required: true, type: 'number' },
        },
      },
    },
    wrongTable: {
      required: true,
      type: 'array',
      items: {
        shape: {
          wrongId: { required: true, type: 'string' },
          knowledgePoint: { required: true, type: 'string' },
          wrongCount: { required: true, type: 'number' },
          corrected: { required: true, type: 'string' },
          mastery: { required: true, type: 'string' },
          reviewedAt: { required: false, type: 'date' },
        },
      },
    },
    goalRings: {
      required: true,
      type: 'array',
      items: {
        shape: {
          type: { required: true, type: 'string' },
          percent: { required: true, type: 'number' },
        },
      },
    },
    goalTable: {
      required: true,
      type: 'array',
      items: {
        shape: {
          type: { required: true, type: 'string' },
          targetMinutes: { required: true, type: 'number' },
          targetResources: { required: true, type: 'number' },
          startDate: { required: true, type: 'string' },
          endDate: { required: true, type: 'string' },
          currentMinutes: { required: true, type: 'number' },
          currentResources: { required: true, type: 'number' },
          adjustmentRecord: { required: true, type: 'array' },
        },
      },
    },
    pomodoroStats: {
      required: true,
      type: 'object',
      shape: {
        weekPomodoroCount: { required: true, type: 'number' },
        weekFocusMinutes: { required: true, type: 'number' },
        daily: {
          required: true,
          type: 'array',
          items: {
            shape: {
              date: { required: true, type: 'string' },
              count: { required: true, type: 'number' },
              focusMinutes: { required: true, type: 'number' },
            },
          },
        },
        recentList: {
          required: true,
          type: 'array',
          items: {
            shape: {
              id: { required: true, type: 'number' },
              resourceName: { required: false, type: 'string' },
              presetName: { required: false, type: 'string' },
              focusMinutes: { required: false, type: 'number' },
              actualFocusSeconds: { required: false, type: 'number' },
              summary: { required: false, type: 'string' },
              startedAt: { required: true, type: 'date' },
              endedAt: { required: false, type: 'date' },
            },
          },
        },
      },
    },
  },

  '/api/pages/ability-map': {
    subjects: {
      required: true,
      type: 'array',
      items: {
        shape: {
          subject: { required: true, type: 'string' },
          overallScore: { required: true, type: 'number' },
          dimensions: {
            required: true,
            type: 'array',
            items: {
              shape: {
                key: { required: true, type: 'string' },
                name: { required: true, type: 'string' },
                color: { required: true, type: 'string' },
                score: { required: true, type: 'number' },
                factors: { required: true, type: 'array' },
              },
            },
          },
        },
      },
    },
    overallRadar: {
      required: true,
      type: 'array',
      items: {
        shape: {
          name: { required: true, type: 'string' },
          value: { required: true, type: 'number' },
          color: { required: true, type: 'string' },
          key: { required: true, type: 'string' },
        },
      },
    },
    dimensionScoreTable: {
      required: true,
      type: 'array',
      items: {
        shape: {
          key: { required: true, type: 'string' },
          name: { required: true, type: 'string' },
          color: { required: true, type: 'string' },
          score: { required: true, type: 'number' },
          level: { required: true, type: 'string' },
          weight: { required: true, type: 'number' },
          topSubject: { required: true, type: 'string' },
          topSubjectScore: { required: true, type: 'number' },
          weakSubject: { required: true, type: 'string' },
          weakSubjectScore: { required: true, type: 'number' },
          suggestion: { required: true, type: 'string' },
        },
      },
    },
    defaultSubject: { required: true, type: 'string' },
  },

  '/api/pages/assignments': {
    items: {
      required: true,
      type: 'array',
      items: {
        shape: {
          submissionId: { required: true, type: 'number' },
          assignmentId: { required: true, type: 'number' },
          title: { required: true, type: 'string' },
          description: { required: true, type: 'string' },
          deadline: { required: false, type: 'date' },
          resourceIds: { required: true, type: 'array', items: { type: 'number' } },
          status: { required: true, type: 'string' },
          submittedAt: { required: false, type: 'date' },
          createdAt: { required: true, type: 'date' },
          isOverdue: { required: true, type: 'boolean' },
        },
      },
    },
    resourceMap: { required: true, type: 'object' },
  },

  '/api/pages/admin/users': {
    heatmap: {
      required: true,
      type: 'array',
      items: {
        shape: {
          stage: { required: true, type: 'string' },
        },
      },
    },
    userList: {
      required: true,
      type: 'array',
      items: {
        shape: {
          userId: { required: true, type: 'number' },
          name: { required: true, type: 'string' },
          stage: { required: false, type: 'string' },
          learningStyle: { required: false, type: 'string' },
          subjectPreference: { required: true, type: 'array', items: { type: 'string' } },
          coreTags: { required: true, type: 'array', items: { type: 'string' } },
          createdAt: { required: true, type: 'date' },
          activity: { required: true, type: 'string' },
          active: { required: true, type: 'boolean' },
        },
      },
    },
    behaviorTop10: {
      required: true,
      type: 'array',
      items: {
        shape: {
          name: { required: true, type: 'string' },
          click: { required: true, type: 'number' },
          learnMinutes: { required: true, type: 'number' },
        },
      },
    },
    behaviorTable: {
      required: true,
      type: 'array',
      items: {
        shape: {
          userId: { required: true, type: 'number' },
          type: { required: true, type: 'string' },
          resourceId: { required: true, type: 'string' },
          occurredAt: { required: true, type: 'date' },
          dwellSeconds: { required: false, type: 'number' },
        },
      },
    },
    tagScatter: {
      required: true,
      type: 'object',
      shape: {
        stages: { required: true, type: 'array', items: { type: 'string' } },
        points: {
          required: true,
          type: 'array',
          items: {
            shape: {
              stage: { required: true, type: 'string' },
              tagName: { required: true, type: 'string' },
              weight: { required: true, type: 'number' },
              userId: { required: true, type: 'number' },
            },
          },
        },
      },
    },
    tagManageTable: {
      required: true,
      type: 'array',
      items: {
        shape: {
          tagId: { required: true, type: 'number' },
          userId: { required: true, type: 'number' },
          tagName: { required: true, type: 'string' },
          audience: { required: true, type: 'string' },
          relatedBehavior: { required: false, type: 'string' },
          weight: { required: true, type: 'number' },
          updatedAt: { required: true, type: 'date' },
        },
      },
    },
  },

  '/api/pages/admin/resources': {
    statusDonut: {
      required: true,
      type: 'array',
      items: {
        shape: {
          name: { required: true, type: 'string' },
          value: { required: true, type: 'number' },
        },
      },
    },
    resourceTable: {
      required: true,
      type: 'array',
      items: {
        shape: {
          resourceId: { required: true, type: 'string' },
          name: { required: true, type: 'string' },
          subject: { required: true, type: 'string' },
          type: { required: true, type: 'string' },
          difficulty: { required: true, type: 'string' },
          status: { required: true, type: 'string' },
          uploadedAt: { required: true, type: 'date' },
        },
      },
    },
    effectTrend: {
      required: true,
      type: 'array',
      items: {
        shape: {
          date: { required: true, type: 'string' },
          completionRate: { required: true, type: 'number' },
        },
      },
    },
    effectTable: {
      required: true,
      type: 'array',
      items: {
        shape: {
          resourceId: { required: true, type: 'string' },
          name: { required: true, type: 'string' },
          learners: { required: true, type: 'number' },
          completionRate: { required: true, type: 'number' },
          goodRate: { required: true, type: 'number' },
          wrongRel: { required: true, type: 'number' },
          suggestion: { required: true, type: 'string' },
        },
      },
    },
    categoryTree: {
      required: true,
      type: 'array',
      items: {
        shape: {
          id: { required: true, type: 'string' },
          label: { required: true, type: 'string' },
          children: { required: false, type: 'array' },
        },
      },
    },
    categoryTable: {
      required: true,
      type: 'array',
      items: {
        shape: {
          categoryId: { required: true, type: 'string' },
          categoryName: { required: true, type: 'string' },
          parentCategory: { required: true, type: 'string' },
          resourceCount: { required: true, type: 'number' },
          sortOrder: { required: true, type: 'number' },
          subject: { required: true, type: 'string' },
          type: { required: true, type: 'string' },
        },
      },
    },
  },

  '/api/pages/admin/system': {
    activeRule: {
      required: false,
      type: 'object',
      shape: {
        ruleId: { required: true, type: 'string' },
        name: { required: true, type: 'string' },
        weightRatio: { required: true, type: 'array' },
        updatedAt: { required: true, type: 'date' },
      },
    },
    ruleSimLine: {
      required: true,
      type: 'array',
      items: {
        shape: {
          name: { required: true, type: 'string' },
          points: {
            required: true,
            type: 'array',
            items: {
              shape: {
                x: { required: true, type: 'string' },
                y: { required: true, type: 'number' },
              },
            },
          },
        },
      },
    },
    weightTable: {
      required: true,
      type: 'array',
      items: {
        shape: {
          name: { required: true, type: 'string' },
          baseWeight: { required: true, type: 'number' },
          factor: { required: true, type: 'number' },
          effectiveAt: { required: true, type: 'date' },
        },
      },
    },
    gauge: {
      required: true,
      type: 'object',
      shape: {
        maxRecommend: { required: true, type: 'number' },
        updateFreq: { required: true, type: 'number' },
      },
    },
    paramTable: {
      required: true,
      type: 'array',
      items: {
        shape: {
          paramId: { required: true, type: 'string' },
          name: { required: true, type: 'string' },
          value: { required: true, type: 'string' },
          defaultValue: { required: true, type: 'string' },
          updatedBy: { required: true, type: 'string' },
          updatedAt: { required: true, type: 'date' },
        },
      },
    },
    logTypeDist: {
      required: true,
      type: 'array',
      items: {
        shape: {
          name: { required: true, type: 'string' },
          value: { required: true, type: 'number' },
        },
      },
    },
    logTable: {
      required: true,
      type: 'array',
      items: {
        shape: {
          logId: { required: true, type: 'number' },
          actor: { required: true, type: 'string' },
          type: { required: true, type: 'string' },
          content: { required: true, type: 'string' },
          occurredAt: { required: true, type: 'date' },
          ip: { required: false, type: 'string' },
          status: { required: true, type: 'string' },
        },
      },
    },
  },

  '/api/pages/admin/assignments': {
    assignments: {
      required: true,
      type: 'array',
      items: {
        shape: {
          id: { required: true, type: 'number' },
          title: { required: true, type: 'string' },
          description: { required: true, type: 'string' },
          deadline: { required: false, type: 'date' },
          resourceIds: { required: true, type: 'array' },
          resourceList: { required: true, type: 'array' },
          targetScope: { required: false, type: 'object' },
          createdBy: { required: false, type: 'number' },
          creatorName: { required: true, type: 'string' },
          createdAt: { required: true, type: 'date' },
          stats: {
            required: true,
            type: 'object',
            shape: {
              total: { required: true, type: 'number' },
              submitted: { required: true, type: 'number' },
              inProgress: { required: true, type: 'number' },
              pending: { required: true, type: 'number' },
              overdue: { required: true, type: 'number' },
              completionRate: { required: true, type: 'number' },
            },
          },
        },
      },
    },
    completionDonut: {
      required: true,
      type: 'array',
      items: {
        shape: {
          name: { required: true, type: 'string' },
          value: { required: true, type: 'number' },
          submitted: { required: true, type: 'number' },
          total: { required: true, type: 'number' },
        },
      },
    },
    classes: { required: true, type: 'array', items: { type: 'string' } },
    tagCategories: { required: true, type: 'array', items: { type: 'string' } },
  },
};

const STUDENT_PAGES = [
  '/api/pages/home',
  '/api/pages/resources',
  '/api/pages/recommendation-analysis',
  '/api/pages/progress',
  '/api/pages/ability-map',
  '/api/pages/assignments',
];

const ADMIN_PAGES = [
  '/api/pages/admin/users',
  '/api/pages/admin/resources',
  '/api/pages/admin/system',
  '/api/pages/admin/assignments',
];

function makeToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'dev-secret');
}

describe('/api/pages/* Response Contract Tests', () => {
  let studentToken;
  let adminToken;

  beforeAll(async () => {
    await waitForDb({ retries: 20, delayMs: 1000 });

    const student = await User.findOne({ where: { username: 'student' } });
    const admin = await User.findOne({ where: { username: 'admin' } });

    if (student) {
      studentToken = makeToken(student.id);
    }
    if (admin) {
      adminToken = makeToken(admin.id);
    }
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Common envelope structure', () => {
    test.each(STUDENT_PAGES)('%s returns ok:true with student auth', async (url) => {
      if (!studentToken) {
        console.warn('Skipping: no student user found in DB (run seed first)');
        return;
      }
      const res = await request(app).get(url).set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(isObject(res.body.data)).toBe(true);
    });

    test.each(ADMIN_PAGES)('%s returns ok:true with admin auth', async (url) => {
      if (!adminToken) {
        console.warn('Skipping: no admin user found in DB (run seed first)');
        return;
      }
      const res = await request(app).get(url).set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(isObject(res.body.data)).toBe(true);
    });

    test('rejects unauthenticated request', async () => {
      const res = await request(app).get('/api/pages/home');
      expect(res.status).toBe(401);
      expect(res.body.ok).toBe(false);
    });

    test('rejects student accessing admin endpoint', async () => {
      if (!studentToken) return;
      const res = await request(app)
        .get('/api/pages/admin/users')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
      expect(res.body.ok).toBe(false);
    });
  });

  describe('Student page data contracts', () => {
    test.each(STUDENT_PAGES)('%s data shape matches contract', async (url) => {
      if (!studentToken) {
        console.warn('Skipping: no student user found in DB (run seed first)');
        return;
      }
      const res = await request(app).get(url).set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);

      const schema = PAGE_SCHEMAS[url];
      expect(schema).toBeDefined();

      expect(() => expectShape(res.body, BASE_RESPONSE_SHAPE)).not.toThrow();
      expect(() => expectShape(res.body.data, schema, 'data')).not.toThrow();
    });
  });

  describe('Admin page data contracts', () => {
    test.each(ADMIN_PAGES)('%s data shape matches contract', async (url) => {
      if (!adminToken) {
        console.warn('Skipping: no admin user found in DB (run seed first)');
        return;
      }
      const res = await request(app).get(url).set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);

      const schema = PAGE_SCHEMAS[url];
      expect(schema).toBeDefined();

      expect(() => expectShape(res.body, BASE_RESPONSE_SHAPE)).not.toThrow();
      expect(() => expectShape(res.body.data, schema, 'data')).not.toThrow();
    });
  });

  describe('Frontend usePageData compatibility', () => {
    test('response payload aligns with usePageData expectations (data.data path)', async () => {
      if (!studentToken) return;
      const res = await request(app)
        .get('/api/pages/home')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('ok');
      expect(res.body).toHaveProperty('data');
      expect(typeof res.body.data).toBe('object');
      expect(res.body.data).not.toBeNull();
    });
  });
});
