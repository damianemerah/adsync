with open("src/components/campaigns/new/steps/budget-launch-step.tsx", "r") as f:
    text = f.read()

# Add import
text = text.replace('import { useState, useMemo, useEffect } from "react";', 'import { useState, useMemo, useEffect } from "react";\nimport { motion } from "framer-motion";')

# Add variants
variants_code = """
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-4xl mx-auto space-y-8 pb-20"
    >"""

# replace the return statement opening
text = text.replace('  return (\n    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-20">', variants_code)

# Replace the closing div of the component
text = text.replace('    </div>\n  );\n}', '    </motion.div>\n  );\n}')

# Apply variants to children
text = text.replace('      {/* Header */}\n      <div className="text-center space-y-2 mb-8">', '      {/* Header */}\n      <motion.div variants={itemVariants} className="text-center space-y-2 mb-8">')
text = text.replace('        </p>\n      </div>\n\n      <div className="grid md:grid-cols-12 gap-8">', '        </p>\n      </motion.div>\n\n      <div className="grid md:grid-cols-12 gap-8">')

text = text.replace('          {/* ── Outcome-First Tier Picker ── */}\n          <div className="space-y-3">', '          {/* ── Outcome-First Tier Picker ── */}\n          <motion.div variants={itemVariants} className="space-y-3">')
text = text.replace('              })}\n            </div>\n          </div>\n\n          {/* ── Custom Budget Input ── */}', '              })}\n            </div>\n          </motion.div>\n\n          {/* ── Custom Budget Input ── */}')

text = text.replace('          {/* ── Custom Budget Input ── */}\n          <div className="space-y-2">', '          {/* ── Custom Budget Input ── */}\n          <motion.div variants={itemVariants} className="space-y-2">')
text = text.replace('            </p>\n          </div>\n\n          {/* ── Live Outcome Projection ── */}', '            </p>\n          </motion.div>\n\n          {/* ── Live Outcome Projection ── */}')

text = text.replace('          {/* ── Live Outcome Projection ── */}\n          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">', '          {/* ── Live Outcome Projection ── */}\n          <motion.div variants={itemVariants} className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">')
text = text.replace('            </p>\n          </div>\n\n          {/* ── Campaign Name ── */}', '            </p>\n          </motion.div>\n\n          {/* ── Campaign Name ── */}')

text = text.replace('          {/* ── Campaign Name ── */}\n          <div className="space-y-2">', '          {/* ── Campaign Group ── */}\n          <motion.div variants={itemVariants} className="p-5 rounded-xl border border-border bg-card/50 shadow-sm space-y-6">\n          {/* ── Campaign Name ── */}\n          <div className="space-y-2">')
text = text.replace('            </div>\n          )}\n        </div>\n\n        {/* Right Column — Launch Card */}', '            </div>\n          )}\n          </motion.div>\n        </div>\n\n        {/* Right Column — Launch Card */}')

text = text.replace('        {/* Right Column — Launch Card */}\n        <div className="md:col-span-5 space-y-4">', '        {/* Right Column — Launch Card */}\n        <motion.div variants={itemVariants} className="md:col-span-5 space-y-4">')
text = text.replace('            </CardContent>\n          </Card>\n        </div>\n\n        {/* Website Tracking Section */}', '            </CardContent>\n          </Card>\n        </motion.div>\n\n        {/* Website Tracking Section */}')

text = text.replace('      {/* Website Tracking Section */}\n      {needsPixel && (\n        <div className="pt-8 border-t border-border animate-in fade-in slide-in-from-bottom-2">', '      {/* Website Tracking Section */}\n      {needsPixel && (\n        <motion.div variants={itemVariants} className="pt-8 border-t border-border mt-8">')
text = text.replace('            </div>\n          </div>\n        </div>\n      )}\n\n      {/* Missing WhatsApp number block */}', '            </div>\n          </div>\n        </motion.div>\n      )}\n\n      {/* Missing WhatsApp number block */}')

text = text.replace('      {/* Missing WhatsApp number block */}\n      {missingWhatsappNumber && (\n        <div className="pt-4 border-t border-border animate-in fade-in slide-in-from-bottom-2">', '      {/* Missing WhatsApp number block */}\n      {missingWhatsappNumber && (\n        <motion.div variants={itemVariants} className="pt-4 border-t border-border mt-4">')
text = text.replace('              </p>\n            </div>\n          </div>\n        </div>\n      )}\n\n      {/* Unresolved targeting warning */}', '              </p>\n            </div>\n          </div>\n        </motion.div>\n      )}\n\n      {/* Unresolved targeting warning */}')

text = text.replace('      {/* Launch Button */}\n      <div className="pt-4 border-t border-border">', '      {/* Launch Button */}\n      <motion.div variants={itemVariants} className="pt-6">')
text = text.replace('        </Button>\n      </div>\n\n      <PaymentDialog', '        </Button>\n      </motion.div>\n\n      <PaymentDialog')

with open("src/components/campaigns/new/steps/budget-launch-step.tsx", "w") as f:
    f.write(text)
