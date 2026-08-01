package dto

import (
	"testing"

	"github.com/QuantumNous/new-api/relaykit/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMediaContentFilePreservesMimeTypeFromFilename(t *testing.T) {
	content := MediaContent{
		Type: ContentTypeFile,
		File: &MessageFile{
			FileName: "context.txt",
			FileData: "aGVsbG8=",
		},
	}

	source, ok := content.ToFileSource().(*types.Base64Source)
	require.True(t, ok)
	assert.Equal(t, "text/plain; charset=utf-8", source.MimeType)
	assert.Equal(t, "aGVsbG8=", source.Base64Data)
}
