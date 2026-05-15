"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_FEEDBACK_ASSET_SIZE_BYTES = exports.ALLOWED_FEEDBACK_ASSET_MIME_TYPES = exports.FEEDBACK_IMAGE_MIME_TYPES = exports.FEEDBACK_SOUND_MIME_TYPES = exports.ALLOWED_FEEDBACK_EFFECT_CATEGORIES = exports.ALLOWED_FEEDBACK_EFFECT_KEYS = exports.FEEDBACK_EFFECT_CATEGORIES = exports.FEEDBACK_EFFECT_KEYS = void 0;
exports.getFeedbackAssetType = getFeedbackAssetType;
exports.FEEDBACK_EFFECT_KEYS = [
    "auth.register.success",
    "auth.login.success",
    "auth.logout.success",
    "dashboard.water.update.success",
    "dashboard.focus.create.success",
    "dashboard.weekly-goal.update.success",
    "dashboard.weekly-stats.update.success",
    "money.category.create.success",
    "money.category.delete.success",
    "money.expense.create.success",
    "money.expense.update.success",
    "money.expense.delete.success",
    "money.salary.create.success",
    "money.salary.delete.success",
    "money.balance.create.success",
    "money.balance.update.success",
    "money.balance.delete.success",
    "money.income.create.success",
    "money.savings.create.success",
    "money.loan.create.success",
    "money.loan.repay.success",
    "money.loan.delete.success",
    "lending.loan.create.success",
    "lending.loan.repay.success",
    "lending.loan.delete.success",
    "lending.lending.create.success",
    "lending.lending.repay.success",
    "lending.lending.delete.success",
    "learning.session.create.success",
    "learning.session.update.success",
    "learning.session.delete.success",
    "learning.session.start.success",
    "learning.session.pause.success",
    "learning.session.resume.success",
    "learning.session.complete.success",
    "learning.session.cancel.success",
    "learning.session.reschedule.success",
    "learning.timer.finish.success",
    "learning.timer-preset.create.success",
    "learning.timer-preset.update.success",
    "learning.timer-preset.delete.success",
    "learning.template.create.success",
    "learning.goals.update.success",
    "learning.child-controls.update.success",
    "learning.note.create.success",
    "learning.note.update.success",
    "learning.note.delete.success",
    "fitness.workout.create.success",
    "fitness.workout.update.success",
    "fitness.workout.delete.success",
    "habits.section.create.success",
    "habits.section.update.success",
    "habits.section.delete.success",
    "habits.section.progress.update.success",
    "admin.user.role.update.success",
    "admin.user.block.update.success",
    "admin.feedback-effect.create.success",
    "admin.feedback-effect.update.success",
    "admin.feedback-effect.delete.success",
    "admin.feedback-effect.upload.success",
    "generic.success",
    "generic.error",
];
exports.FEEDBACK_EFFECT_CATEGORIES = [
    "auth",
    "dashboard",
    "money",
    "lending",
    "learning",
    "fitness",
    "habits",
    "admin",
    "generic",
];
exports.ALLOWED_FEEDBACK_EFFECT_KEYS = new Set(exports.FEEDBACK_EFFECT_KEYS);
exports.ALLOWED_FEEDBACK_EFFECT_CATEGORIES = new Set(exports.FEEDBACK_EFFECT_CATEGORIES);
exports.FEEDBACK_SOUND_MIME_TYPES = [
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "audio/mp4",
];
exports.FEEDBACK_IMAGE_MIME_TYPES = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
];
exports.ALLOWED_FEEDBACK_ASSET_MIME_TYPES = new Set([
    ...exports.FEEDBACK_SOUND_MIME_TYPES,
    ...exports.FEEDBACK_IMAGE_MIME_TYPES,
]);
exports.MAX_FEEDBACK_ASSET_SIZE_BYTES = 2 * 1024 * 1024;
function getFeedbackAssetType(mimeType) {
    if (exports.FEEDBACK_SOUND_MIME_TYPES.includes(mimeType)) {
        return "sound";
    }
    if (exports.FEEDBACK_IMAGE_MIME_TYPES.includes(mimeType)) {
        return "image";
    }
    return null;
}
