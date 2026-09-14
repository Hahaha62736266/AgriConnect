package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type ProgramStatus string

const (
	ProgramStatusOpen   ProgramStatus = "open"
	ProgramStatusClosed ProgramStatus = "closed"
)

type ApplicationStatus string

const (
	ApplicationStatusSubmitted   ApplicationStatus = "submitted"
	ApplicationStatusUnderReview ApplicationStatus = "under_review"
	ApplicationStatusApproved    ApplicationStatus = "approved"
	ApplicationStatusRejected    ApplicationStatus = "rejected"
)

// Program represents a government agricultural support program / subsidy.
type Program struct {
	ID                  bson.ObjectID `bson:"_id,omitempty"          json:"id"`
	Title               string        `bson:"title"                  json:"title"`
	Description         string        `bson:"description"            json:"description"`
	Agency              string        `bson:"agency"                 json:"agency"` // e.g. "DA-RFO III", "Municipal Agriculture Office"
	EligibilityCriteria []string      `bson:"eligibility_criteria"   json:"eligibilityCriteria"`
	RequiredDocuments   []string      `bson:"required_documents"     json:"requiredDocuments"`
	Region              string        `bson:"region,omitempty"       json:"region,omitempty"`
	Province            string        `bson:"province,omitempty"     json:"province,omitempty"`
	Municipality        string        `bson:"municipality,omitempty" json:"municipality,omitempty"`
	Deadline            time.Time     `bson:"deadline"               json:"deadline"`
	ImageUrl            string        `bson:"image_url,omitempty"    json:"imageUrl,omitempty"`
	Status              ProgramStatus `bson:"status"                 json:"status"` // "open" or "closed"
	CreatedBy           bson.ObjectID `bson:"created_by"             json:"createdBy,omitempty"`
	CreatedAt           time.Time     `bson:"created_at"             json:"createdAt"`
	UpdatedAt           time.Time     `bson:"updated_at"             json:"updatedAt"`
}

// ProgramApplication represents a farmer's submission for a government program.
type ProgramApplication struct {
	ID             bson.ObjectID     `bson:"_id,omitempty"         json:"id"`
	ProgramID      bson.ObjectID     `bson:"program_id"            json:"programId"`
	FarmerID       bson.ObjectID     `bson:"farmer_id"             json:"farmerId"`
	FarmerName     string            `bson:"farmer_name"           json:"farmerName"`
	FarmerPhone    string            `bson:"farmer_phone"          json:"farmerPhone"`
	FarmerRegion   string            `bson:"farmer_region"         json:"farmerRegion"`
	FarmerProvince string            `bson:"farmer_province,omitempty" json:"farmerProvince,omitempty"`
	FarmerMunicipality string        `bson:"farmer_municipality,omitempty" json:"farmerMunicipality,omitempty"`
	FarmSizeHectares float64          `bson:"farm_size_hectares"    json:"farmSizeHectares"`
	CropsGrown     []string          `bson:"crops_grown"           json:"cropsGrown"`
	RSBSANumber    string            `bson:"rsbsa_number,omitempty" json:"rsbsaNumber,omitempty"`
	SubmittedDocs  []string          `bson:"submitted_docs"        json:"submittedDocs"` // File paths or document titles
	Status         ApplicationStatus `bson:"status"                json:"status"`        // "submitted", "under_review", "approved", "rejected"
	Remarks        string            `bson:"remarks,omitempty"     json:"remarks,omitempty"`
	ReviewedBy     *bson.ObjectID    `bson:"reviewed_by,omitempty" json:"reviewedBy,omitempty"`
	SubmittedAt    time.Time         `bson:"submitted_at"          json:"submittedAt"`
	CreatedAt      time.Time         `bson:"created_at"            json:"createdAt"`
	UpdatedAt      time.Time         `bson:"updated_at"            json:"updatedAt"`
	
	// Populated program details when listing farmer applications
	ProgramTitle   string            `bson:"-"                     json:"programTitle,omitempty"`
}

// CreateProgramRequest payload
type CreateProgramRequest struct {
	Title               string   `json:"title"`
	Description         string   `json:"description"`
	Agency              string   `json:"agency"`
	Region              string   `json:"region,omitempty"`
	Province            string   `json:"province,omitempty"`
	Municipality        string   `json:"municipality,omitempty"`
	EligibilityCriteria []string `json:"eligibilityCriteria"`
	RequiredDocuments   []string `json:"requiredDocuments"`
	ImageUrl            string   `json:"imageUrl,omitempty"`
	Deadline            string   `json:"deadline"` // YYYY-MM-DD
}

// SubmitApplicationRequest payload
type SubmitApplicationRequest struct {
	RSBSANumber      string   `json:"rsbsaNumber,omitempty"`
	FarmSizeHectares float64  `json:"farmSizeHectares"`
	CropsGrown       []string `json:"cropsGrown"`
	SubmittedDocs    []string `json:"submittedDocs"`
}

// UpdateApplicationStatusRequest payload
type UpdateApplicationStatusRequest struct {
	Status  ApplicationStatus `json:"status"`
	Remarks string            `json:"remarks"`
}
